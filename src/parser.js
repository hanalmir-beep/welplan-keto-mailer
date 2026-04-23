/**
 * parser.js — welplan 마크다운 응답을 구조화된 객체로 파싱합니다.
 *
 * 마크다운 형식 예시:
 * ## 패밀리홀
 * - [수제] 닭가슴살 토마토살사 포케
 *   - Nutrition: 289 kcal, carb 26.94g, protein 21.34g, fat 11.11g, sugar 5.98g, sodium 488.94mg
 *   - Components: ...
 */

/**
 * 영양 정보 문자열을 파싱합니다.
 * @param {string} nutritionStr "289 kcal, carb 26.94g, protein 21.34g, fat 11.11g, sugar 5.98g, sodium 488.94mg"
 * @returns {{calories: number, carb: number, protein: number, fat: number, sugar: number, sodium: number}}
 */
function parseNutrition(nutritionStr) {
  if (!nutritionStr || nutritionStr === 'No nutrition data') {
    return null
  }

  const nutrition = {
    calories: 0,
    carb: 0,
    protein: 0,
    fat: 0,
    sugar: 0,
    sodium: 0
  }

  // "289 kcal" 패턴
  const calMatch = nutritionStr.match(/([\d.]+)\s*kcal/)
  if (calMatch) nutrition.calories = parseFloat(calMatch[1])

  // "carb 26.94g" 패턴
  const carbMatch = nutritionStr.match(/carb\s+([\d.]+)g/)
  if (carbMatch) nutrition.carb = parseFloat(carbMatch[1])

  // "protein 21.34g" 패턴
  const proteinMatch = nutritionStr.match(/protein\s+([\d.]+)g/)
  if (proteinMatch) nutrition.protein = parseFloat(proteinMatch[1])

  // "fat 11.11g" 패턴
  const fatMatch = nutritionStr.match(/fat\s+([\d.]+)g/)
  if (fatMatch) nutrition.fat = parseFloat(fatMatch[1])

  // "sugar 5.98g" 패턴
  const sugarMatch = nutritionStr.match(/sugar\s+([\d.]+)g/)
  if (sugarMatch) nutrition.sugar = parseFloat(sugarMatch[1])

  // "sodium 488.94mg" 패턴
  const sodiumMatch = nutritionStr.match(/sodium\s+([\d.]+)mg/)
  if (sodiumMatch) nutrition.sodium = parseFloat(sodiumMatch[1])

  return nutrition
}

/**
 * 마크다운 텍스트를 파싱하여 식당별 메뉴 목록으로 변환합니다.
 * @param {string} markdown
 * @returns {{date: string, mealTime: string, type: string, restaurants: Array<{name: string, menus: Array}>}}
 */
export function parseMenuMarkdown(markdown) {
  if (!markdown || !markdown.trim()) {
    return { date: '', mealTime: '', type: '', restaurants: [] }
  }

  const lines = markdown.split('\n')

  // frontmatter에서 메타 정보 추출
  let date = ''
  let mealTime = ''
  let type = ''

  // title 라인에서 추출: "2026년 4월 24일 (금) 아침 Takeout Menus"
  const titleMatch = markdown.match(/^title:\s*(.+)$/m)
  if (titleMatch) {
    const title = titleMatch[1]
    if (title.includes('아침')) mealTime = '아침'
    else if (title.includes('점심')) mealTime = '점심'
    else if (title.includes('저녁')) mealTime = '저녁'

    if (title.includes('Takeout') || title.includes('takeout')) type = 'takeout'
    else if (title.includes('Take-in') || title.includes('takein')) type = 'takein'
  }

  // Date 라인에서 추출
  const dateMatch = markdown.match(/- Date:\s*(.+)$/m)
  if (dateMatch) date = dateMatch[1].trim()

  // 식당별 메뉴 파싱
  const restaurants = []
  let currentRestaurant = null
  let currentMenu = null

  for (const line of lines) {
    // ## 식당명
    const restaurantMatch = line.match(/^## (.+)$/)
    if (restaurantMatch) {
      const name = restaurantMatch[1].trim()
      // "Discovery" 섹션은 건너뛰기
      if (name === 'Discovery') break
      currentRestaurant = { name, menus: [] }
      restaurants.push(currentRestaurant)
      currentMenu = null
      continue
    }

    if (!currentRestaurant) continue

    // - 메뉴이름
    const menuMatch = line.match(/^- (.+)$/)
    if (menuMatch) {
      currentMenu = {
        name: menuMatch[1].trim(),
        nutrition: null,
        components: []
      }
      currentRestaurant.menus.push(currentMenu)
      continue
    }

    if (!currentMenu) continue

    // - Nutrition: ...
    const nutritionMatch = line.match(/^\s+- Nutrition:\s*(.+)$/)
    if (nutritionMatch) {
      currentMenu.nutrition = parseNutrition(nutritionMatch[1])
      continue
    }

    // - Components: ...
    const componentsMatch = line.match(/^\s+- Components:\s*(.+)$/)
    if (componentsMatch) {
      currentMenu.components = componentsMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      continue
    }
  }

  return { date, mealTime, type, restaurants }
}

/**
 * 모든 식당의 메뉴를 하나의 플랫 배열로 합칩니다.
 * 각 메뉴에 식당 이름과 타입(takein/takeout)을 추가합니다.
 * @param {ReturnType<typeof parseMenuMarkdown>} parsed
 * @returns {Array<{name: string, restaurant: string, nutrition: object, components: string[], type: string}>}
 */
export function flattenMenus(parsed) {
  const result = []
  for (const restaurant of parsed.restaurants) {
    for (const menu of restaurant.menus) {
      result.push({
        ...menu,
        restaurant: restaurant.name,
        menuType: parsed.type
      })
    }
  }
  return result
}
