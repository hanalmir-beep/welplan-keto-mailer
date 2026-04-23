/**
 * scorer.js — 각 메뉴의 저탄고지(키토) 적합도를 점수화합니다.
 *
 * 점수 계산 기준:
 * - 탄수화물 비율이 낮을수록 높은 점수
 * - 지방 비율이 높을수록 높은 점수
 * - 단백질 비율이 높을수록 높은 점수
 * - 설탕이 적을수록 높은 점수
 * - 비현실적으로 높은 칼로리 (세트/묶음 메뉴) 페널티
 */

/**
 * 매크로 영양소의 칼로리 비율을 계산합니다.
 * 탄수화물: 4kcal/g, 단백질: 4kcal/g, 지방: 9kcal/g
 */
function macroRatios(nutrition) {
  const carbCal = nutrition.carb * 4
  const proteinCal = nutrition.protein * 4
  const fatCal = nutrition.fat * 9
  const total = carbCal + proteinCal + fatCal

  if (total === 0) return { carbRatio: 0, proteinRatio: 0, fatRatio: 0 }

  return {
    carbRatio: carbCal / total,
    proteinRatio: proteinCal / total,
    fatRatio: fatCal / total
  }
}

/**
 * 저탄고지 점수를 계산합니다 (0~100).
 *
 * @param {{calories: number, carb: number, protein: number, fat: number, sugar: number}} nutrition
 * @returns {number} 0~100 사이의 점수
 */
export function calculateKetoScore(nutrition) {
  if (!nutrition || nutrition.calories === 0) return 0

  const { carbRatio, proteinRatio, fatRatio } = macroRatios(nutrition)

  // 기본 점수: 지방 비율 높을수록, 탄수화물 비율 낮을수록 좋음
  let score = 0

  // 지방 비율 점수 (최대 40점)
  score += fatRatio * 60

  // 단백질 비율 점수 (최대 30점)
  score += proteinRatio * 45

  // 탄수화물 감점 (최대 -40점)
  score -= carbRatio * 40

  // 탄수화물 절대량 보너스/페널티
  if (nutrition.carb <= 20) score += 15 // 극 저탄수
  else if (nutrition.carb <= 50) score += 8 // 저탄수
  else if (nutrition.carb <= 80) score += 0 // 보통
  else if (nutrition.carb <= 130) score -= 5 // 높음
  else score -= 15 // 매우 높음

  // 설탕 페널티
  if (nutrition.sugar > 20) score -= 10
  else if (nutrition.sugar > 10) score -= 5

  // 비현실적 칼로리 페널티 (묶음/세트 메뉴)
  if (nutrition.calories > 3000) score -= 20
  else if (nutrition.calories > 2000) score -= 10

  // 0~100 범위로 정규화
  return Math.max(0, Math.min(100, Math.round((score + 30) * 1.2)))
}

/**
 * 점수에 따른 등급을 반환합니다.
 * @param {number} score
 * @returns {{stars: string, label: string, emoji: string}}
 */
export function getKetoGrade(score) {
  if (score >= 70) return { stars: '⭐⭐⭐', label: '매우 적합', emoji: '🥇' }
  if (score >= 50) return { stars: '⭐⭐', label: '적합', emoji: '🥈' }
  if (score >= 30) return { stars: '⭐', label: '보통', emoji: '🥉' }
  return { stars: '', label: '부적합', emoji: '⚠️' }
}

/**
 * 메뉴 목록을 저탄고지 점수로 정렬하고 상위 N개를 추천합니다.
 *
 * @param {Array<{name: string, restaurant: string, nutrition: object, menuType: string}>} menus
 * @param {number} topN 추천 개수 (기본 3)
 * @returns {Array<{...menu, ketoScore: number, grade: object}>}
 */
export function recommendMenus(menus, topN = 3) {
  // 영양 정보가 있는 메뉴만 필터
  const scoredMenus = menus
    .filter((menu) => menu.nutrition && menu.nutrition.calories > 0)
    // 묶음 메뉴("외 N종") 제외 — 영양 정보가 합산이라 부정확
    .filter((menu) => !menu.name.match(/외\s*\d+종$/))
    // 음료/디저트류 제외
    .filter((menu) => {
      const n = menu.nutrition
      // 탄/단/지 중 하나라도 의미 있는 값이 있어야 함
      return n.carb > 0 || n.protein > 0 || n.fat > 0
    })
    .filter((menu) => {
      const name = menu.name.toLowerCase()
      return (
        !name.includes('케익') &&
        !name.includes('케이크') &&
        !name.includes('마카롱') &&
        !name.includes('기픈물') &&
        !name.includes('생수')
      )
    })
    .map((menu) => {
      const ketoScore = calculateKetoScore(menu.nutrition)
      const grade = getKetoGrade(ketoScore)
      return { ...menu, ketoScore, grade }
    })
    .sort((a, b) => b.ketoScore - a.ketoScore)

  // 같은 이름의 메뉴가 여러 식당에 있을 수 있으므로, 이름 기준 중복 제거 (가장 높은 점수 유지)
  const seen = new Set()
  const deduplicated = scoredMenus.filter((menu) => {
    const key = menu.name.trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduplicated.slice(0, topN)
}

/**
 * 전체 메뉴에 점수를 매겨서 반환합니다 (추천 아닌 전체 목록용).
 */
export function scoreAllMenus(menus) {
  return menus
    .filter((menu) => menu.nutrition && menu.nutrition.calories > 0)
    .filter((menu) => !menu.name.match(/외\s*\d+종$/))
    .map((menu) => {
      const ketoScore = calculateKetoScore(menu.nutrition)
      const grade = getKetoGrade(ketoScore)
      return { ...menu, ketoScore, grade }
    })
    .sort((a, b) => b.ketoScore - a.ketoScore)
}
