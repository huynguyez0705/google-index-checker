import requests as req
from bs4 import BeautifulSoup
import time

# URL cơ bản để lấy User-Agent
base_url = 'http://www.useragentstring.com/pages/useragentstring.php?name='

# File để lưu tất cả User-Agent
output_file = 'user-agents.txt'

def save_to_file(user_agent):
    """Lưu User-Agent vào file user-agents.txt"""
    with open(output_file, 'a') as f:
        f.write(user_agent + '\n')

def fetch_user_agents(browser):
    """Thu thập User-Agent cho một trình duyệt cụ thể"""
    url = base_url + browser
    response = req.get(url)

    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
    else:
        print(f"Failed to fetch User-Agents for {browser}")
        return

    # Tìm danh sách User-Agent trong thẻ <div> với id='liste'
    div = soup.find('div', {'id': 'liste'})
    if div:
        links = div.findAll('a')
        for link in links:
            try:
                save_to_file(link.text)
            except Exception as e:
                print(f"Error saving User-Agent: {e}")
    else:
        print(f"No User-Agents found for {browser}")

# Danh sách các trình duyệt để lấy User-Agent
browsers = ['Firefox', 'Internet+Explorer', 'Opera', 'Safari', 'Chrome', 'Edge', 'Android+Webkit+Browser']

# Xóa nội dung file nếu đã tồn tại trước đó
open(output_file, 'w').close()

# Thu thập User-Agent cho từng trình duyệt
for browser in browsers:
    print(f"Fetching User-Agents for {browser}...")
    fetch_user_agents(browser)
    time.sleep(20)  # Đợi 20 giây giữa mỗi trình duyệt để tránh bị chặn
