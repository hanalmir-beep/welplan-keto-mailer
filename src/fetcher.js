/**
 * fetcher.js — welplan.pmh.codes에서 메뉴 데이터를 마크다운 형태로 가져옵니다.
 *
 * 미래기술캠퍼스 식당:
 *  - REST000016 (삼성미래기술캠퍼스, welstory)
 *  - CAF14 (SAIT, shinsegae/PlanEAT)
 */

const BASE_URL = 'https://welplan.pmh.codes'

const RESTAURANTS_COOKIE = JSON.stringify([
  { id: 'REST000016', name: '삼성미래기술캠퍼스', vendor: 'welstory' },
  { id: 'CAF14', name: 'SAIT', vendor: 'shinsegae', busiCd: 'RH3_K_002', compCd: 'K_KR_035', storCd: 'CAF14', orgTreeId: '1:6:0' }
])

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 */
export function todayDateStr() {
  const now = new Date()
  // KST (UTC+9) 기준
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/**
 * 오늘이 평일인지 확인 (월~금)
 */
export function isWeekday() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay() // 0=일, 6=토
  return day >= 1 && day <= 5
}

/**
 * 날짜 문자열을 한국어 형식으로 변환 (YYYYMMDD → "2026년 4월 24일 (금)")
 */
export function formatKoreanDate(dateStr) {
  const y = parseInt(dateStr.slice(0, 4))
  const m = parseInt(dateStr.slice(4, 6))
  const d = parseInt(dateStr.slice(6, 8))
  const dt = new Date(y, m - 1, d)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  return `${y}년 ${m}월 ${d}일 (${dayNames[dt.getDay()]})`
}

/**
 * welplan 마크다운 API에서 메뉴 데이터를 가져옵니다.
 * @param {'takeout'|'takein'} type
 * @param {string} date YYYYMMDD
 * @param {number} mealTimeId 1=아침, 2=점심, 3=저녁
 * @returns {Promise<string>} 마크다운 텍스트
 */
async function fetchMenuMarkdown(type, date, mealTimeId) {
  const url = `${BASE_URL}/${type}/${date}/${mealTimeId}`
  const cookieValue = encodeURIComponent(RESTAURANTS_COOKIE)

  const response = await fetch(url, {
    headers: {
      Accept: 'text/markdown',
      Cookie: `welplan_restaurants=${cookieValue}`
    },
    signal: AbortSignal.timeout(120_000) // 2분 타임아웃
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

/**
 * 하루치 전체 메뉴를 가져옵니다.
 * - 아침: 테이크아웃만
 * - 점심: 테이크인 + 테이크아웃
 * - 저녁: 테이크인 + 테이크아웃
 *
 * @param {string} date YYYYMMDD
 * @returns {Promise<{breakfast: string, lunch: {takein: string, takeout: string}, dinner: {takein: string, takeout: string}}>}
 */
export async function fetchAllMenus(date) {
  console.log(`📡 ${date} 메뉴 데이터를 가져오는 중...`)

  const [breakfast, lunchTakein, lunchTakeout, dinnerTakein, dinnerTakeout] = await Promise.all([
    fetchMenuMarkdown('takeout', date, 1).catch((e) => {
      console.warn(`  ⚠️ 아침 테이크아웃 가져오기 실패: ${e.message}`)
      return ''
    }),
    fetchMenuMarkdown('takein', date, 2).catch((e) => {
      console.warn(`  ⚠️ 점심 테이크인 가져오기 실패: ${e.message}`)
      return ''
    }),
    fetchMenuMarkdown('takeout', date, 2).catch((e) => {
      console.warn(`  ⚠️ 점심 테이크아웃 가져오기 실패: ${e.message}`)
      return ''
    }),
    fetchMenuMarkdown('takein', date, 3).catch((e) => {
      console.warn(`  ⚠️ 저녁 테이크인 가져오기 실패: ${e.message}`)
      return ''
    }),
    fetchMenuMarkdown('takeout', date, 3).catch((e) => {
      console.warn(`  ⚠️ 저녁 테이크아웃 가져오기 실패: ${e.message}`)
      return ''
    })
  ])

  console.log(`  ✅ 데이터 수집 완료`)

  return {
    breakfast,
    lunch: { takein: lunchTakein, takeout: lunchTakeout },
    dinner: { takein: dinnerTakein, takeout: dinnerTakeout }
  }
}
