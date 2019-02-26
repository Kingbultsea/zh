function dateFormat (date, format) { // yy:mm:ss //这样都行 yyyy年mmmm分sss秒
    if (!format || typeof format !== 'string') {
        console.error('format is undefiend or type is Error')
        return ''
    }

    date = date instanceof Date ? date : (typeof date === 'number' || typeof date === 'string') ? new Date(date) : new Date()

    // 解析
    let formatReg = {
        'y+': date.getFullYear(),
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds()
    }
    for (let reg in formatReg) {
        if (new RegExp(reg).test(format)) {
            let match = RegExp.lastMatch // 上一次的匹配到的字符串
            format = format.replace(match, formatReg[reg] < 10 ? '0' + formatReg[reg] : formatReg[reg].toString())
        }
    }
    return format
}

module.exports = dateFormat
