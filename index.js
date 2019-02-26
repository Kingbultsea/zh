const request = require('request')
const { Builder, By, Key, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/chrome')
const { seleniumProxy } = require('selenium-webdriver/proxy')
const { dump } = require('dumper.js')
const fs = require('fs')
const path = require('path')

const timeFormat = require('./util/time')
let driver = null

const user = 'zdmi'

async function start () {
    // 初始化浏览器
    const chromeOptions = new Options()
    chromeOptions.windowSize({ width: 1124, height: 850 })
    const builder = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)

    // driver 并不需要代理
    driver = await builder.build()

    // await getQuestionsKey(21160234)
    // return

    const { page, resCountPage, user, follwerCountPage } = await getActivities() // 爬取个人主页信息 返回page 页面数量  粉丝页面数量
    const followerExclude = await followerExcludePace(follwerCountPage)
    return

    const articlesGroup = await getNumberPACK(resCountPage, getArticleNumber) // 获取用户文章id
    const keysArticlesGroup = await getKeysPACK(articlesGroup, getArticleKey) // 词云 文章

    const questionsGroup = await getNumberPACK(page, getAnswersNumber) // 获取用户所回答过的帖子的id
    const keysQuestionsGroup = await getKeysPACK(questionsGroup, getQuestionsKey) // 词云 回答的问题

    saveFile({ keysQuestionsGroup, keysArticlesGroup, userData: user, followerExclude })
}

async function getActivities () { // 爬取个人主页信息

    await driver.get(`https://www.zhihu.com/people/${user}/activities`)
    // 获取user相关信息
    const regScript = /<script\s*id="js-initialData"\s*type="text\/json">(.+?)<\/script>/
    let scriptFileData = regScript.exec(await driver.getPageSource())
    const data = JSON.parse(scriptFileData[1])
    const commonData = data.initialState.entities.users[user] // 获取了名称 回答数之类的
    const save = { businessName: '无' }
    dump('用户名称：' + commonData.name)
    if (commonData.business) {
        save.businessName = commonData.business.name
    }
    dump('用户所在行业：' + save.businessName) //  所在行业
    dump('用户回答数：' + commonData.answerCount)
    dump('用户文章数：' + commonData.articlesCount)
    dump('用户想法数：' + commonData.pinsCount)
    // console.log('个人成就')
    dump('知乎收录数：' + commonData.includedAnswersCount)
    dump('用户获得赞同数：' + commonData.voteupCount)
    dump('用户获得感谢数：' + commonData.thankedCount)
    dump('用户获得收藏数：' + commonData.favoritedCount)
    dump('用户关注者数目：' + commonData.followerCount)

    const dataU = {
        '用户名称：': commonData.name,
        '用户所在行业：': save.businessName,
        '用户回答数：': commonData.answerCount,
        '用户文章数：': commonData.articlesCount,
        '用户想法数：': commonData.pinsCount,
        '知乎收录数：': commonData.includedAnswersCount,
        '用户获得赞同数：': commonData.voteupCount,
        '用户获得感谢数：': commonData.thankedCount,
        '用户获得收藏数：': commonData.favoritedCount,
        '用户关注者数目：': commonData.followerCount
    }
    return { page: Math.ceil(commonData.answerCount / 20), user: dataU, resCountPage: Math.ceil(commonData.articlesCount / 20), follwerCountPage: Math.ceil(commonData.followerCount / 20) }

}

async function getNumberPACK (page, cb) { // 封装 获取用户所回答过的帖子的id
    let group = []
    // dump(page)
    for (let i = 0; i < page; i++) {
        group.push(...await cb(i * 20))
    }
    return [...new Set(group)]
    // dump([...new Set(group)])
}

async function getAnswersNumber (offset) { // 获取用户所回答过的帖子的id
    // await driver.get(`https://www.zhihu.com/people/${user}/answers?page=1`)
    await driver.get(`https://www.zhihu.com/api/v4/members/${user}/answers?include=data%5B*%5D.is_normal%2Cadmin_closed_comment%2Creward_info%2Cis_collapsed%2Cannotation_action%2Cannotation_detail%2Ccollapse_reason%2Ccollapsed_by%2Csuggest_edit%2Ccomment_count%2Ccan_comment%2Ccontent%2Cvoteup_count%2Creshipment_settings%2Ccomment_permission%2Cmark_infos%2Ccreated_time%2Cupdated_time%2Creview_info%2Cquestion%2Cexcerpt%2Cis_labeled%2Clabel_info%2Crelationship.is_authorized%2Cvoting%2Cis_author%2Cis_thanked%2Cis_nothelp%3Bdata%5B*%5D.author.badge%5B%3F(type%3Dbest_answerer)%5D.topics&offset=${offset}&limit=20&sort_by=created`)
    const regScript = /<pre\s*.*?>(.+?)<\/pre>/

    const data = JSON.parse(regScript.exec(await driver.getPageSource())[1])
    let group = []
    for (let i of data.data) {
        // dump(i.question.id)
        group.push(i.question.id)
    }

    return group
    // await driver.sleep(12000)
    /* await driver.findElements(By.className('List-item')).then(async found => {
        dump(found.length)
    }) */
}

async function getArticleNumber (offset) { // 获取用户文章 并没有封装 清晰化
    await driver.get(`https://www.zhihu.com/api/v4/members/${user}/articles?include=data%5B*%5D.comment_count%2Csuggest_edit%2Cis_normal%2Cthumbnail_extra_info%2Cthumbnail%2Ccan_comment%2Ccomment_permission%2Cadmin_closed_comment%2Ccontent%2Cvoteup_count%2Ccreated%2Cupdated%2Cupvoted_followees%2Cvoting%2Creview_info%2Cis_labeled%2Clabel_info%3Bdata%5B*%5D.author.badge%5B%3F(type%3Dbest_answerer)%5D.topics&offset=${offset}&limit=20&sort_by=created`)
    const regScript = /<pre\s*.*?>(.+)<\/pre>/

    const data = JSON.parse(regScript.exec(await driver.getPageSource())[1])
    console.log(data.length)
    let group = []
    for (let i of data.data) {
        // dump(i.question.id)
        group.push(i.id)
    }

    return group
}

async function getKeysPACK (groupId, cb) {
    let group = []
    for (let i of groupId) {
        group.push(...await cb(i))
    }
    return group
}

async function getQuestionsKey (qid) {
    await driver.get(`https://www.zhihu.com/question/${qid}`)
    let labels = []
    await driver.findElements(By.className('QuestionTopic')).then(async found => {
        for (let i of found) {
            labels.push(await i.getText())
        }
    })
    console.log(labels)
    return labels
}

async function getArticleKey (qid) {
    await driver.get(`https://zhuanlan.zhihu.com/p/${qid}`)
    let labels = []
    await driver.findElements(By.className('Topic')).then(async found => {
        for (let i of found) {
            labels.push(await i.getText())
        }
    })
    console.log(labels)
    return labels
}


async function saveFile ({ keysQuestionsGroup, keysArticlesGroup, userData, followerExclude }) {
    const m = new Map()
    for (let i of keysQuestionsGroup) {
        if (m.has(i)) {
            m.set(i, m.get(i) + 1)
        } else {
            m.set(i, 1)
        }
    }

    const m2 = new Map()
    for (let i of keysArticlesGroup) {
        if (m2.has(i)) {
            m2.set(i, m2.get(i) + 1)
        } else {
            m2.set(i, 1)
        }
    }

    const data = JSON.stringify(
        {
            questions: [...m.entries()],
            article: [...m2.entries()],
            user: userData,
            followerExclude
        }
    )
    const fileName = timeFormat(new Date().getTime(), 'yyyy-MM-dd-')
    fs.writeFile(path.join(__dirname, './data/' + fileName + user + '.json'), data, (err) => {
        if (err) throw err
        console.log(err)
    })
}

async function followerExcludePace (times) {
    let save = {
        responseCount: 0,
        article: 0,
        followerAndArticle: 0
    }
    for (let i = 0; i < times; i++) {
        const data = await followerExclude(i + 1)
        save.responseCount += data.responseCount
        save.article += data.article
        save.followerAndArticle += data.followerAndArticle
    }
    dump(save)
    return save
}

async function followerExclude (page) {
    let save = {
        responseCount: 0,
        article: 0,
        followerAndArticle: 0
    }

    await driver.get(`https://www.zhihu.com/people/${user}/followers?page=${page}`)
    await driver.findElements(By.className('ContentItem-status')).then(async found => {
        for (let i of found) {
            const data = await i.getText()
            if (data.indexOf('回答') >= 0) {
                save.responseCount += 1
            }
            if (data.indexOf('文章') >= 0) {
                save.article += 1
            }
            if (data.indexOf('回答') >= 0 && data.indexOf('文章') >= 0) {
                save.followerAndArticle += 1
            }
        }
    })

    // dump(save)
    return save
}

start()
// console.log(timeFormat(new Date().getTime(), 'yyyy/mm/dd/ssss'))
// saveFile([1,2,3,1,2,3,1,2,3])
