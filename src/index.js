/**
 * index.js — 미래기술캠퍼스 저탄고지 식단 추천 메일링 서비스 메인 스크립트
 *
 * 실행 방법:
 *   node src/index.js          # 이메일 발송
 *   node src/index.js --dry-run # 발송 없이 콘솔에 출력
 */

import { fetchAllMenus, todayDateStr, isWeekday, formatKoreanDate } from './fetcher.js'
import { parseMenuMarkdown, flattenMenus } from './parser.js'
import { recommendMenus, scoreAllMenus } from './scorer.js'
import { buildEmailHtml, buildEmailSubject } from './emailBuilder.js'
import { sendEmail } from './mailer.js'

// .env 파일 로드 (로컬 실행용, dotenv 없이 수동 로드)
async function loadEnv() {
  try {
    const { readFileSync, existsSync } = await import('fs')
    const { resolve } = await import('path')
    const envPath = resolve(process.cwd(), '.env')
    
    if (!existsSync(envPath)) return

    const content = readFileSync(envPath, 'utf-8')
    content.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        if (!process.env[key]) process.env[key] = value
      }
    })
  } catch (err) {
    console.warn('  ⚠️ .env 로드 중 오류:', err.message)
  }
}

/**
 * 하나의 식사 시간에 대한 메뉴를 처리합니다.
 * @param {string} label 식사 시간 라벨 (아침/점심/저녁)
 * @param {Array<string>} markdowns 마크다운 텍스트 배열
 * @returns {{recommended: Array, all: Array}}
 */
function processMealMenus(label, markdowns) {
  const allMenus = []

  for (const md of markdowns) {
    if (!md) continue
    const parsed = parseMenuMarkdown(md)
    const flat = flattenMenus(parsed)
    allMenus.push(...flat)
  }

  if (allMenus.length === 0) {
    console.log(`  ℹ️ ${label}: 메뉴 없음`)
    return { recommended: [], all: [] }
  }

  // 디버그용: 전체 메뉴 목록 출력
  if (process.argv.includes('--debug')) {
    console.log(`  🔍 ${label} 전체 메뉴:`, allMenus.map(m => `[${m.restaurant}] ${m.name}`).join(', '))
  }

  const recommended = recommendMenus(allMenus, 3)
  const all = scoreAllMenus(allMenus)

  console.log(`  📋 ${label}: 전체 ${all.length}개 메뉴, 추천 ${recommended.length}개`)
  for (const menu of recommended) {
    console.log(
      `     ${menu.grade.emoji} [${menu.ketoScore}점] ${menu.name} — 탄${menu.nutrition.carb}g/단${menu.nutrition.protein}g/지${menu.nutrition.fat}g (${menu.restaurant})`
    )
  }

  return { recommended, all }
}

async function main() {
  const startTime = Date.now()
  const dryRun = process.argv.includes('--dry-run')
  const forceRun = process.argv.includes('--force')

  console.log('🥑 미래기술캠퍼스 저탄고지 식단 추천 메일링 서비스')
  console.log('━'.repeat(50))

  // .env 로드
  await loadEnv()

  // 평일 체크
  if (!isWeekday() && !forceRun) {
    console.log('📅 오늘은 주말/공휴일이라 실행하지 않습니다.')
    console.log('   --force 옵션으로 강제 실행할 수 있습니다.')
    process.exit(0)
  }

  const date = todayDateStr()
  const dateLabel = formatKoreanDate(date)
  console.log(`📅 날짜: ${dateLabel}`)
  console.log(`📧 수신자: ${process.env.EMAIL_TO || 'hanalmir@gmail.com'}`)
  if (dryRun) console.log('🔧 모드: DRY RUN (이메일 발송 안 함)')
  console.log('')

  // 1. 메뉴 데이터 수집
  const rawMenus = await fetchAllMenus(date)

  // 2. 식사별 처리
  console.log('\n🔍 저탄고지 분석 중...')

  const breakfast = processMealMenus('아침 (테이크아웃)', [rawMenus.breakfast])

  const lunch = processMealMenus('점심 (테이크인+테이크아웃)', [
    rawMenus.lunch.takein,
    rawMenus.lunch.takeout
  ])

  const dinner = processMealMenus('저녁 (테이크인+테이크아웃)', [
    rawMenus.dinner.takein,
    rawMenus.dinner.takeout
  ])

  // 3. 이메일 빌드
  console.log('\n📝 이메일 생성 중...')
  const html = buildEmailHtml(dateLabel, breakfast, lunch, dinner)
  const subject = buildEmailSubject(dateLabel)

  // 4. 이메일 발송 (또는 dry-run)
  const to = process.env.EMAIL_TO || 'hanalmir@gmail.com'
  await sendEmail(to, subject, html, dryRun)

  // dry-run이면 HTML 파일로도 저장
  if (dryRun) {
    try {
      const { writeFileSync } = await import('fs')
      const { resolve } = await import('path')
      const { fileURLToPath } = await import('url')
      const __dirname = resolve(fileURLToPath(import.meta.url), '..')
      const outputPath = resolve(__dirname, '..', 'preview.html')
      writeFileSync(outputPath, html, 'utf-8')
      console.log(`\n📄 이메일 미리보기 저장: ${outputPath}`)
    } catch {
      // 파일 저장 실패는 무시
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n✅ 완료! (${elapsed}초 소요)`)
}

main().catch((err) => {
  console.error('\n❌ 실행 중 오류 발생:', err.message)
  process.exit(1)
})
