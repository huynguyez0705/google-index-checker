// Required Modules
import 'dotenv/config'
import chalk from 'chalk' // Terminal and string styling
import axios from 'axios' // Axios client
import { createWriteStream, readFileSync, access, writeFileSync, existsSync } from 'fs' // Node file system module
import { parseCSV } from './lib/parser.js' // Convert csv to json module
import { googlelify, encodeURL } from './lib/url-encoder.js' // Encoding functions
import { timer } from './lib/timer.js' // Timer function
import sanitizeHtml from 'sanitize-html'

// Settings
const {
	yellowBright: infoColor, // Màu thông tin
	cyanBright: successColor, // Màu thành công
	whiteBright: detailColor, // Màu chi tiết
	redBright: errorColor, // Màu lỗi
	greenBright: highlightColor, // Màu nổi bật
	magentaBright: importantColor, // Màu quan trọng
	blueBright: actionColor // Màu hành động
} = chalk

const start = Date.now() // Bộ đếm thời gian để tính toán thời gian chạy
const site = 'https://www.google.com/search?q=site:' // Câu truy vấn tìm kiếm Google
const urlsFile = '1.csv' // Thay bằng đường dẫn đầy đủ nếu cần
const userAgentsFile = './user-agents.txt' // File chứa danh sách User-Agents

let count = 1
let notIndexedCounter = 0
let urls = []
let len = 0
let userAgents = []

// Load User-Agents from file
function loadUserAgents() {
	try {
		const data = readFileSync(userAgentsFile, 'utf8') // Đọc file user-agents.txt
		return data
			.split('\n')
			.map(line => line.trim()) // Loại bỏ khoảng trắng
			.filter(line => /^[\x20-\x7E]+$/.test(line)) // Đảm bảo chỉ chứa ký tự hợp lệ
	} catch (error) {
		console.error(errorColor(`Lỗi khi tải file User-Agents: ${error.message}`))
		process.exit(1)
	}
}

// Function to get a random User-Agent
function getRandomUserAgent() {
	const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
	console.log(importantColor(`Sử dụng User-Agent: ${userAgent}`)) // Log User-Agent được chọn
	return userAgent
}

// Collect URLs and run requests
;(async () => {
	// Load User-Agents
	userAgents = loadUserAgents()
	if (userAgents.length === 0) {
		console.error(errorColor('Không tìm thấy User-Agents hợp lệ trong user-agents.txt.'))
		process.exit(1)
	}

	// Load URLs
	urls = await getUrls()
	len = urls.length

	for (const url of urls) {
		await runRequest(url)
		// Thêm độ trễ giữa các yêu cầu để tránh bị chặn
		await new Promise(resolve => setTimeout(resolve, 1000)) // Độ trễ 1 giây
	}

	finalMessage(len)
})()

// Gather URLs from file
async function getUrls() {
	console.log(infoColor(`Đang kiểm tra file: ${urlsFile}`)) // Log đường dẫn file

	// Kiểm tra file tồn tại
	if (!existsSync(urlsFile)) {
		console.error(errorColor(`File ${urlsFile} không tồn tại.`))
		process.exit(1)
	}

	console.log(successColor('File tồn tại và có thể truy cập.')) // Xác nhận file hợp lệ
	return await parseCSV(urlsFile)
}

// HTTP request async
async function runRequest(url) {
	try {
		// Chuẩn bị URL để tìm kiếm trên Google
		const requestUrl = `${site}${encodeURL(url)}`

		// Lấy User-Agent ngẫu nhiên
		const randomUserAgent = getRandomUserAgent()

		// Gửi yêu cầu HTTP bằng axios
		const { data, status } = await axios.get(requestUrl, {
			headers: {
				'User-Agent': randomUserAgent // Sử dụng User-Agent ngẫu nhiên
			}
		})

		// Kiểm tra kết quả tìm kiếm
		const indexation = matchResponse(url, data)

		// In ra trạng thái từng URL, số thứ tự và mã trạng thái
		const counter = `${count++}/${len}`
		const statusPrint = highlightColor.bold(status)
		const indexPrint = detailColor.bold(indexation)

		console.table(actionColor(`Đang kiểm tra: ${counter} ${url} - Status ${statusPrint} - Status: ${indexPrint}`))

		// Tạo, thêm, và xóa stream
		const stream = createWriteStream('./results.csv', { flags: 'a', encoding: 'utf8' })

		// Ghi kết quả vào file
		stream.write(`${url}, ${indexation}\n`)
		// Đóng stream để tránh tràn bộ nhớ
		stream.end()
	} catch (error) {
		console.error(infoColor(`Lỗi khi xử lý URL: ${url} - ${errorColor(error.message)}`))
	}
}

// So sánh URL với kết quả tìm kiếm trên Google
function matchResponse(url, res) {
	// Tìm các thẻ <a> có thuộc tính href
	const content = sanitizeHtml(res, {
		allowedTags: ['a'],
		allowedAttributes: { a: ['href'] }
	})

	// Mặc định là "Chưa được lập chỉ mục"
	let indexResult = 'No Index'

	// Nếu URL được mã hóa có trong kết quả tìm kiếm Google
	if (content.includes(`href="${encodeURL(url)}"`)) {
		indexResult = 'Indexed'
	} else {
		notIndexedCounter += 1
	}

	return indexResult
}

// In thông báo cuối cùng
function finalMessage(totalUrls) {
	console.log(`\nĐã xử lý ${totalUrls} URL. Kết quả được ghi vào results.csv trong ${timer(Date.now() - start)}\n`)
	console.log(`${highlightColor.bold(`Indexed: ` + (totalUrls - notIndexedCounter))}\n${errorColor.bold(`No Index: ` + notIndexedCounter + `\n`)}`)
}
