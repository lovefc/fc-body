/*
 * @Author       : lovefc
 * @Date         : 2021-02-22 08:49:39
 * @LastEditTime : 2021-03-11 17:37:26
 */

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const os = require('os');
const mime_types = require('./types.js');

/* 切割buffer */
Buffer.prototype.split = Buffer.prototype.split || function (spl) {
	let arr = [];
	let cur = 0;
	let n = 0;
	while ((n = this.indexOf(spl, cur)) != -1) {
		arr.push(this.slice(cur, n));
		cur = n + spl.length;
	}
	arr.push(this.slice(cur));
	return arr;
}

class body {

	// 构造函数,开始了
	constructor(options) {
		let that = this;

		this.type = ''; // 限制上传类型

		this.mimes = []; // 存储下类型

		this.isAutoSaveFile = false; // 是否自动存储文件,设为不存储,那么file_data返回的是该文件的二进制数据,需要自己手动保存

		this.savePath = os.tmpdir(); // 上传目录,默认是临时目录

		this.minSize = 0; // 最小限制

		this.maxSize = 5; // 最大限制

		this.errorMsg = {
			'TIMEOUT': 'POST超时',
			'UNDERSIZE': '数据过小',
			'OVERSIZE': '数据过大',
			'NOTALLOWEDTYPE': '不允许的类型'
		};

		// 接受数据结束事件
		this.closeEvent = function () {

		};

		// 这里用了个暴力的方式来覆盖初始配置
		for (let key in options) {
			if (key in that) {
				that[key] = options[key];
			}
		}

		this.checkType();
	}

	error(err, path) {
		let error = {
			code: '',
			message: '',
			path: ''
		};
		// 很奇怪,err返回的变量竟然是个错误对象
		if (Object.prototype.toString.call(err) === "[object Error]") {
			error.code = err.code;
			error.message = err.toString();
			error.path = err.path;
		} else if (typeof err === 'string') {
			error.code = err;
			error.message = this.errorMsg[err];
			error.path = path;
		}
		return error;
	}

	// 验证类型
	checkType() {
		let that = this;
		let str = this.type;
		if (!str) {
			return false;
		}
		let typeArr = str.split(',');
		let mimeArr = [];
		typeArr.forEach(function (v, index, a) {
			if (v in mime_types) {
				that.mimes[index] = mime_types[v];
			}
		});
	}

	// 写入文件
	writefile(file, body) {
		return new Promise((resolve, reject) => {
			fs.writeFile(file, body, "binary", function (err) {
				if (err) {
					reject(err);
				}
				resolve(true);
			});
		});
	}

	// 是否上传文件
	isUpfile(request) {
		let type = ('content-type' in request.headers) ? request.headers['content-type'] : '';
		if (type.match(/boundary=(?:"([^"]+)"|([^;]+))/i)) {
			return true;
		}
		return false;
	}

	// 是否为post
	isPost(request) {
		let type = ('content-type' in request.headers) ? request.headers['content-type'] : '';
		if (type.match(/application\/x-www-form-urlencoded/i)) {
			return true;
		}
		return false;
	}

	// 是否为raw
	isRaw(request) {
		let type = ('content-type' in request.headers) ? request.headers['content-type'] : '';
		if (type.match(/text\/plain/i)) {
			return true;
		}
		return false;
	}

	// 获取post数据
	getBody(req) {
		let that = this;
		let request = req;
		// 异步操作
		return new Promise((resolve, reject) => {
			let body = '',
				chunks = [],
				size = 0;

			// 超时
			request.on('aborted', function () {
				reject(that.error('PTIMEOUT'));
			});

			// 接受数据
			request.on("data", function (postDataChunk) {
				chunks.push(postDataChunk); // 为什么要这样?一般使用postDataChunk += postDataChunk,这会把buf转换成string,这就是字符串相加了
				size += Buffer.from(postDataChunk).length; // 获取长度 
				// 判断最小post
				if (that.minSize) {
					let minLimitNum = that.limitFileSize(that.minSize + 'MB');
					if (size < minLimitNum) {
						reject(that.error('UNDERSIZE'));
						return;
					}
				}
				// 判断最大post
				if (that.maxSize) {
					let maxLimitNum = that.limitFileSize(that.maxSize + 'MB');
					if (size > maxLimitNum) {
						reject(that.error('OVERSIZE'));
						return;
					}
				}
			});

			// 数据接收完毕，执行回调函数
			request.on("end", function () {
				let buf = Buffer.concat(chunks, size); // 这里为什么要指定size,因为指定size后,计算的会更快一点
				if (that.isUpfile(request)) {
					try {
						body = that.upload(request, buf);
					} catch (e) {
						reject(e);
					}
				} else if (that.isPost(request)) {
					body = querystring.parse(buf.toString());
				} else if (that.isRaw(request)) { // 这里其实是txt形式的,所以它返回的也是txt
					body = buf.toString();
				} else {
					body = buf;
				}
				// 判断,如果为空
				if (Buffer.isBuffer(buf) && buf.length == 0) {
					body = null;
				}
				chunks = [];
				resolve(body);
			});

			// 链接关闭
			request.on('close', that.closeEvent);

			// 出现错误
			request.on('error', function (err) {
				reject(that.error(err));
			});
		});
	}

	// 计算大小格式
	limitFileSize(limitSize) {
		let arr = ["KB", "MB", "GB"],
			limit = limitSize.toUpperCase(),
			limitNum = 0;
		for (let i = 0; i < arr.length; i++) {
			let leval = limit.indexOf(arr[i]);
			if (leval > -1) {
				limitNum = parseInt(limit.substr(0, leval)) * Math.pow(1024, (i + 1));
				break;
			}
		}
		return limitNum;
	}

	// 生成uuid
	UUID(len, radix) {
		let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
		let uuid = [],
			i;
		radix = radix || chars.length;
		if (len) {
			for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
		} else {
			let r;
			uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
			uuid[14] = '4';
			for (i = 0; i < 36; i++) {
				if (!uuid[i]) {
					r = 0 | Math.random() * 16;
					uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
				}
			}
		}
		return uuid.join('');
	}

	async upload(request, postData) {
		let file_array = {};
		// 这里按照换行符分割
		let buffer = Buffer.from(postData);
		let _arr = buffer.split('\r\n'); // 这一步很简单,根据\r\n来切割buffer,我并不知道其它的切片是怎么做的,我只是用我的方式,测试过,还不错			
		let files = [];
		let file_data = [];
		let start_line = [];
		let k = 0;
		// 这一步先取出位置
		for (let i = 0; i < _arr.length; i++) {
			let file = [];
			let str = _arr[i].toString(); // 转成字符串来匹配,因为现在是buffer,toString的默认编码是utf8
			let match = /Content-Disposition: form-data; (name=""|name="(.+?)")(; filename="(.+?)"|)/i;
			let m2 = str.match(match);
			if (m2 != null) {
				start_line[k] = i;
				k++;
				file['name'] = m2[2];
				if (m2[3]) {
					file['name'] = m2[2] ? m2[2] : m2[4];
					file['file_name'] = m2[4];
				}
			}
			if (file['name'] || file['file_name']) {
				files[i] = file;
			}
		}
		start_line.push(_arr.length - 1);
		files = files.filter(d => d);
		// 这一步,开始分割body内容
		for (let i2 = 0; i2 < files.length; i2++) {
			let start = 0,
				end = 0,
				name2 = files[i2]['name'],
				arr = {};
			if (typeof (files[i2]['file_name']) != 'undefined') {
				start = start_line[i2] + 3;
				let str = _arr[start_line[i2] + 1].toString();
				let match2 = /Content-Type: ([\s\S]+)/i;
				let m3 = str.match(match2);
				arr['name'] = files[i2]['file_name'];
				if (m3 != null) {
					arr['type'] = m3[1];
					// 等于-1,说明不存在
					if (this.mimes.length != 0 && this.mimes.indexOf(arr['type']) == -1) {
						throw this.error('NOTALLOWEDTYPE', files[i2]['file_name']);
						break;
					}
				}
			} else {
				start = start_line[i2] + 2;
			}
			end = start_line[i2 + 1] - 1;
			let buf_list = _arr.slice(start, end);
			if (buf_list) {
				// 合并buffer数组,很重要的一步哦
				let buf_array = [];
				let body = Buffer.concat(buf_list);
				let size = Buffer.from(body).length; // 获取大小,可避免中文字符串的转换问题
				if (typeof (files[i2]['file_name']) != 'undefined') {
					buf_list.forEach(function (v, k) {
						let buffer1 = Buffer.from(v);
						if (k == (buf_list.length - 1)) {
							buf_array[k] = buffer1;
						} else {
							let buffer2 = Buffer.from('\r\n');
							buf_array[k] = Buffer.concat([buffer1, buffer2]);
						}
					});
					body = Buffer.concat(buf_array);
					arr['size'] = size;
					// 判断是否自动保存到临时文件夹
					if (this.isAutoSaveFile === true) {
						let uuid = this.UUID(10, 16);
						let file_name = uuid + '_' + files[i2]['file_name'];
						let tmp_file = this.savePath + path.sep + file_name;
						arr['tmp_name'] = tmp_file;
						try {
							await this.writefile(tmp_file, body);
						} catch (e) {
							throw this.error(e);
						}
					} else {
						arr['data'] = body;
					}
				} else {
					arr = body.toString();
				}
				// 清掉内存
				body = null;
				buf_array = null;
			}
			// 如果有[]符号,这个用来处理多文件
			let _name2 = name2.match(/\[\]$/i);
			if (_name2) {
				if (file_array.hasOwnProperty(name2) === false) {
					file_array[name2] = [];
				}
				file_array[name2].push(arr);
			} else {
				file_array[name2] = arr;
			}
		}
		files = null;
		return file_array;
	}

}

module.exports = body;