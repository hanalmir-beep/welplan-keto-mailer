/**
 * emailBuilder.js — 저탄고지 추천 메뉴를 예쁜 HTML 이메일로 빌드합니다.
 */

/**
 * 영양 정보를 간결한 문자열로 포맷합니다.
 */
function formatNutrition(n) {
  if (!n) return ''
  return `${n.calories}kcal · 탄 ${n.carb}g / 단 ${n.protein}g / 지 ${n.fat}g`
}

/**
 * 식사별 추천 메뉴 섹션을 HTML로 렌더링합니다.
 */
function renderMealSection(title, emoji, menus, allMenus) {
  if (!menus || menus.length === 0) {
    return `
      <div style="margin-bottom:32px;">
        <div style="font-size:18px;font-weight:700;color:#e2e8f0;margin-bottom:12px;padding:12px 16px;background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;">
          ${emoji} ${title}
        </div>
        <div style="padding:16px;color:#94a3b8;font-style:italic;">오늘은 이 시간대 메뉴가 없습니다.</div>
      </div>`
  }

  const recommendedHtml = menus
    .map(
      (menu, i) => `
      <div style="background:${i === 0 ? 'linear-gradient(135deg,#1a2332,#1e3a2f)' : '#1e293b'};border:1px solid ${i === 0 ? '#22c55e33' : '#334155'};border-radius:12px;padding:16px;margin-bottom:8px;${i === 0 ? 'box-shadow:0 0 20px rgba(34,197,94,0.1);' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:16px;font-weight:600;color:#f1f5f9;">${menu.grade.emoji} ${menu.name}</span>
          <span style="font-size:12px;padding:4px 10px;border-radius:20px;background:${menu.ketoScore >= 70 ? '#166534' : menu.ketoScore >= 50 ? '#854d0e' : '#78350f'};color:${menu.ketoScore >= 70 ? '#86efac' : menu.ketoScore >= 50 ? '#fde047' : '#fdba74'};">${menu.grade.stars} ${menu.ketoScore}점</span>
        </div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:4px;">📍 ${menu.restaurant}${menu.menuType === 'takeout' ? ' (테이크아웃)' : ''}</div>
        <div style="font-size:13px;color:#67e8f9;font-family:monospace;">${formatNutrition(menu.nutrition)}</div>
        ${menu.components && menu.components.length > 0 ? `<div style="font-size:12px;color:#64748b;margin-top:6px;">🍽️ ${menu.components.join(', ')}</div>` : ''}
      </div>`
    )
    .join('')

  // 나머지 메뉴 (점수 순으로 최대 5개)
  const otherMenus = allMenus
    .filter((m) => !menus.some((rec) => rec.name === m.name))
    .slice(0, 5)

  const othersHtml =
    otherMenus.length > 0
      ? `
      <div style="margin-top:12px;padding:12px;background:#0f172a;border-radius:8px;border:1px solid #1e293b;">
        <div style="font-size:12px;color:#64748b;margin-bottom:8px;font-weight:600;">📋 기타 메뉴</div>
        ${otherMenus
          .map(
            (m) =>
              `<div style="font-size:12px;color:#94a3b8;padding:4px 0;border-bottom:1px solid #1e293b;">${m.grade.emoji} ${m.name} <span style="color:#64748b;">| ${m.restaurant} | ${formatNutrition(m.nutrition)}</span></div>`
          )
          .join('')}
      </div>`
      : ''

  return `
    <div style="margin-bottom:32px;">
      <div style="font-size:18px;font-weight:700;color:#e2e8f0;margin-bottom:12px;padding:12px 16px;background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;border-left:4px solid #3b82f6;">
        ${emoji} ${title}
      </div>
      ${recommendedHtml}
      ${othersHtml}
    </div>`
}

/**
 * 전체 이메일 HTML을 빌드합니다.
 *
 * @param {string} dateLabel "2026년 4월 24일 (금)"
 * @param {{recommended: Array, all: Array}} breakfast
 * @param {{recommended: Array, all: Array}} lunch
 * @param {{recommended: Array, all: Array}} dinner
 * @returns {string} HTML 문자열
 */
export function buildEmailHtml(dateLabel, breakfast, lunch, dinner) {
  const breakfastSection = renderMealSection(
    '아침 (테이크아웃)',
    '🌅',
    breakfast.recommended,
    breakfast.all
  )
  const lunchSection = renderMealSection('점심', '🍱', lunch.recommended, lunch.all)
  const dinnerSection = renderMealSection('저녁', '🌙', dinner.recommended, dinner.all)

  // 오늘의 요약 통계
  const totalMenus =
    (breakfast.all?.length || 0) + (lunch.all?.length || 0) + (dinner.all?.length || 0)
  const ketoFriendly =
    [...(breakfast.all || []), ...(lunch.all || []), ...(dinner.all || [])].filter(
      (m) => m.ketoScore >= 50
    ).length

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- 헤더 -->
    <div style="text-align:center;padding:32px 20px;background:linear-gradient(135deg,#0f172a,#1e1b4b,#1e3a5f);border-radius:16px;margin-bottom:24px;border:1px solid #334155;">
      <div style="font-size:28px;margin-bottom:8px;">🥑</div>
      <h1 style="margin:0;font-size:22px;color:#f1f5f9;font-weight:800;">저탄고지 식단 추천</h1>
      <div style="font-size:14px;color:#94a3b8;margin-top:8px;">📅 ${dateLabel} · 미래기술캠퍼스</div>
      <div style="margin-top:16px;display:inline-block;">
        <span style="font-size:12px;padding:6px 14px;border-radius:20px;background:#1e293b;color:#67e8f9;border:1px solid #334155;">
          📊 전체 ${totalMenus}개 메뉴 중 저탄고지 적합 ${ketoFriendly}개
        </span>
      </div>
    </div>

    <!-- 메뉴 섹션 -->
    ${breakfastSection}
    ${lunchSection}
    ${dinnerSection}

    <!-- 저탄고지 팁 -->
    <div style="background:linear-gradient(135deg,#1a2332,#1e293b);border-radius:12px;padding:20px;margin-top:8px;border:1px solid #334155;">
      <div style="font-size:14px;font-weight:700;color:#fbbf24;margin-bottom:10px;">💡 오늘의 저탄고지 팁</div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.6;">
        ${getRandomTip()}
      </div>
    </div>

    <!-- 등급 안내 -->
    <div style="margin-top:20px;padding:16px;background:#0f172a;border-radius:8px;border:1px solid #1e293b;">
      <div style="font-size:12px;color:#64748b;text-align:center;">
        🥇 매우 적합(70+) · 🥈 적합(50~69) · 🥉 보통(30~49) · ⚠️ 부적합(~29)
      </div>
      <div style="font-size:11px;color:#475569;text-align:center;margin-top:8px;">
        점수 기준: 지방·단백질 비율 ↑ 탄수화물·당류 비율 ↓ | 
        <a href="https://welplan.pmh.codes" style="color:#3b82f6;">welplan.pmh.codes</a>
      </div>
    </div>

    <!-- 푸터 -->
    <div style="text-align:center;padding:24px;font-size:11px;color:#475569;">
      🤖 이 메일은 welplan-keto-mailer에 의해 자동 생성되었습니다.<br>
      데이터 출처: <a href="https://welplan.pmh.codes" style="color:#3b82f6;">welplan.pmh.codes</a>
    </div>
  </div>
</body>
</html>`
}

/**
 * 랜덤 저탄고지 팁을 반환합니다.
 */
function getRandomTip() {
  const tips = [
    '밥은 반공기만, 반찬 위주로 드세요. 특히 단백질과 채소 반찬을 먼저 드시면 혈당 급상승을 막을 수 있습니다.',
    '국물 요리는 건더기 위주로 드세요. 면 대신 건더기만 먹어도 탄수화물을 크게 줄일 수 있습니다.',
    '샐러드를 선택할 때 드레싱을 따로 받아 조절하면 당분 섭취를 줄일 수 있습니다.',
    '구이류, 찜류가 튀김류보다 저탄고지에 더 적합합니다. 조리 방식도 확인해보세요.',
    '김밥은 밥 비율이 높으니, 포케나 샐러드로 대체하면 탄수화물을 절반 이하로 줄일 수 있습니다.',
    '죽이나 라면 대신 된장찌개, 육개장 같은 국물 요리의 건더기만 드시는 것도 좋은 전략입니다.',
    '테이크아웃 메뉴 중 달걀, 닭가슴살, 견과류가 포함된 메뉴는 저탄고지에 가장 적합합니다.',
    '식사 전 물 한 잔을 마시면 포만감이 높아져 탄수화물 과다 섭취를 방지할 수 있습니다.'
  ]
  return tips[Math.floor(Math.random() * tips.length)]
}

/**
 * 이메일 제목을 생성합니다.
 */
export function buildEmailSubject(dateLabel) {
  return `🥑 ${dateLabel} 미래기술캠퍼스 저탄고지 식단 추천`
}
