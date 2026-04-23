/**
 * mailer.js — Nodemailer를 사용하여 Gmail SMTP로 이메일을 발송합니다.
 */

import { createTransport } from 'nodemailer'

/**
 * Gmail SMTP 트랜스포터를 생성합니다.
 * Gmail 앱 비밀번호가 필요합니다:
 *   https://myaccount.google.com/apppasswords
 */
function createGmailTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    throw new Error(
      'SMTP_USER 와 SMTP_PASS 환경변수가 설정되지 않았습니다.\n' +
        'Gmail 앱 비밀번호를 생성하세요: https://myaccount.google.com/apppasswords'
    )
  }

  return createTransport({
    service: 'gmail',
    auth: { user, pass }
  })
}

/**
 * 이메일을 발송합니다. 실패 시 최대 3회 재시도합니다.
 *
 * @param {string} to 수신자 이메일
 * @param {string} subject 제목
 * @param {string} html HTML 본문
 * @param {boolean} dryRun true면 발송하지 않고 콘솔에만 출력
 */
export async function sendEmail(to, subject, html, dryRun = false) {
  const from = `"${process.env.EMAIL_FROM_NAME || '웰플랜 저탄고지 추천봇'}" <${process.env.SMTP_USER}>`

  if (dryRun) {
    console.log('\n📧 [DRY RUN] 이메일 발송을 시뮬레이션합니다:')
    console.log(`  From: ${from}`)
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  HTML 길이: ${html.length} 글자`)
    console.log('  ✅ 실제 발송은 하지 않습니다.')
    return { messageId: 'dry-run', accepted: [to] }
  }

  const transporter = createGmailTransporter()
  const maxRetries = 3
  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 이메일 발송 중... (시도 ${attempt}/${maxRetries})`)
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html
      })
      console.log(`  ✅ 발송 성공! MessageID: ${info.messageId}`)
      return info
    } catch (error) {
      lastError = error
      console.error(`  ❌ 발송 실패 (시도 ${attempt}/${maxRetries}): ${error.message}`)
      if (attempt < maxRetries) {
        const delay = attempt * 2000
        console.log(`  ⏳ ${delay / 1000}초 후 재시도...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(`이메일 발송 실패 (${maxRetries}회 시도): ${lastError.message}`)
}
