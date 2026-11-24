namespace SpriteKind {
    export const Weapon = SpriteKind.create()
    export const EnemyShot = SpriteKind.create()
    export const RLEnemy = SpriteKind.create()
    export const Minion = SpriteKind.create()
    export const ArmorItem = SpriteKind.create()
    export const WeaponItem = SpriteKind.create()
}

// ==========================================
// 1. 게임 기본 설정 & 스테이지 변수 (기존 컨트롤 유지)
// ==========================================
const GROUND_Y = 108
const pixelsToMeters = 30
const gravity = 9.81 * pixelsToMeters
const invincibilityPeriod = 1000

let currentStage = 1
const MAX_STAGE = 3
const KILLS_PER_STAGE = 2
let stageKills = 0
let totalKills = 0
const STAGE_TITLES = ["CURSED GRAVEYARD", "BURNING CASTLE", "DEMON ALTAR"]

let heroFacingLeft = false
let canDoubleJump = false
let doubleJumpSpeed = 0
let armorState = 2 // 3: 황금갑옷(공격력2배), 2: 은갑옷, 1: 팬티
let weaponType = 0 // 0: 창(LANCE), 1: 단검(DAGGER), 2: 횃불(TORCH)
const WEAPON_NAMES = ["LANCE", "DAGGER", "TORCH"]

let isInvincible = false
let isStageTransition = false

// 스테이지별 1방향 점프 발판 데이터
let platX: number[] = []
let platY: number[] = []
let platW: number[] = []

let heroPrevBottom = GROUND_Y
let demonPrevBottom = GROUND_Y

// ==========================================
// 2. 강화학습 (Q-Learning + Experience Replay)
// ==========================================
const NUM_STATES = 36
const NUM_ACTIONS = 5
const ACTION_NAMES = ["CHASE", "BACK", "FLY", "FIRE", "DIVE"]

let qTable: number[] = []
for (let i = 0; i < NUM_STATES * NUM_ACTIONS; i++) {
    qTable.push(0)
}

const REPLAY_MAX = 16
let bufS: number[] = []
let bufA: number[] = []
let bufR: number[] = []
let bufNS: number[] = []
let bufIdx = 0

let alpha = 0.22
let gamma = 0.88
let epsilon = 0.40

let lastState = 0
let lastAction = 0
let lastQVal = 0
let wasInDanger = false
let stepReward = 0
let enemyMaxHP = 5
let enemyHP = enemyMaxHP

// ==========================================
// 3. 스프라이트 이미지
// ==========================================
const imgKnightRight = img`
    . . . . . . 2 2 2 . . . . . . .
    . . . . . 9 9 9 9 9 . . . . . .
    . . . . 9 1 9 9 9 9 9 . . . . .
    . . . . 9 9 f f f 9 9 . . . . .
    . . . . 9 9 d d d 9 9 . . . . .
    . . . . . 9 9 9 9 9 . . . . . .
    . . . . 9 1 9 9 9 1 9 . . . . .
    . . . 9 9 9 9 9 9 9 9 9 . . . .
    . . . 9 . 9 9 1 9 9 . 9 . . . .
    . . . . . 9 9 9 9 9 . . . . . .
    . . . . . 9 9 . 9 9 . . . . . .
    . . . . . 9 9 . 9 9 . . . . . .
    . . . . . c c . c c . . . . . .
    . . . . . c c c c c c . . . . .
    . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . .
`
const imgKnightLeft = imgKnightRight.clone()
imgKnightLeft.flipX()

const imgGoldRight = img`
    . . . . . . 2 2 2 . . . . . . .
    . . . . . 5 5 5 5 5 . . . . . .
    . . . . 5 1 5 5 5 5 5 . . . . .
    . . . . 5 5 f f f 5 5 . . . . .
    . . . . 5 5 d d d 5 5 . . . . .
    . . . . . 5 5 5 5 5 . . . . . .
    . . . . 5 1 5 5 5 1 5 . . . . .
    . . . 5 5 5 5 5 5 5 5 5 . . . .
    . . . 5 . 5 5 1 5 5 . 5 . . . .
    . . . . . 5 5 5 5 5 . . . . . .
    . . . . . 5 5 . 5 5 . . . . . .
    . . . . . 5 5 . 5 5 . . . . . .
    . . . . . 4 4 . 4 4 . . . . . .
    . . . . . 4 4 4 4 4 4 . . . . .
    . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . .
`
const imgGoldLeft = imgGoldRight.clone()
imgGoldLeft.flipX()

const imgBoxerRight = img`
    . . . . . . e e e . . . . . . .
    . . . . . e e e e e . . . . . .
    . . . . . d d f d d . . . . . .
    . . . . . d d d d d . . . . . .
    . . . . . . d d d . . . . . . .
    . . . . . d d d d d . . . . . .
    . . . . d d d d d d d . . . . .
    . . . . d . d d d . d . . . . .
    . . . . . . 1 1 1 . . . . . . .
    . . . . . 1 2 1 2 1 . . . . . .
    . . . . . 1 1 . 1 1 . . . . . .
    . . . . . d d . d d . . . . . .
    . . . . . d d . d d . . . . . .
    . . . . . e e . e e . . . . . .
    . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . .
`
const imgBoxerLeft = imgBoxerRight.clone()
imgBoxerLeft.flipX()

const imgDemonGround = img`
    . . . 2 . . . . . . . 2 . . . .
    . . 2 2 . . 2 2 2 . . 2 2 . . .
    . 2 2 . . 2 2 2 2 2 . . 2 2 . .
    . 2 . . 2 2 5 2 5 2 2 . . 2 . .
    . . . . 2 2 2 2 2 2 2 . . . . .
    . . . 2 2 2 f f f 2 2 2 . . . .
    . . 2 2 2 2 2 2 2 2 2 2 2 . . .
    . 2 2 . 2 2 4 4 4 2 2 . 2 2 . .
    . 2 . . . 2 2 2 2 2 . . . 2 . .
    . . . . . 2 2 . 2 2 . . . . . .
    . . . . 2 2 . . . 2 2 . . . . .
    . . . . f f . . . f f . . . . .
`

const imgDemonFly = img`
    2 2 . . . . 2 2 2 . . . . . 2 2
    2 2 2 . . 2 2 2 2 2 . . . 2 2 2
    . 2 2 2 2 2 5 2 5 2 2 2 2 2 2 .
    . . 2 2 2 2 2 2 2 2 2 2 2 2 . .
    . . . 2 2 2 f f f 2 2 2 . . . .
    . . . . 2 2 2 4 2 2 2 . . . . .
    . . . . . 2 2 4 2 2 . . . . . .
    . . . . . 2 2 . 2 2 . . . . . .
    . . . . 2 2 . . . 2 2 . . . . .
    . . . . f . . . . . f . . . . .
`

// 소형 몬스터 3종 (좀비, 박쥐, 점프 해골)
const imgZombie = img`
    . . . 7 7 7 7 . . .
    . . 7 7 f 7 f 7 . .
    . . 7 7 7 7 7 7 . .
    . . . 7 2 2 7 . . .
    . 7 7 7 c c 7 7 7 .
    . . . c c c c . . .
    . . . c c c c . . .
    . . . c . . c . . .
    . . . 7 . . 7 . . .
    . . f f . . f f . .
`

const imgBat = img`
    a . . . . . . . . a
    a a . . a a . . a a
    a a a a 2 a 2 a a a
    . a a a a a a a a .
    . . . a a a a . . .
    . . . . a a . . . .
`

const imgSkull = img`
    . . 1 1 1 1 . .
    . 1 1 1 1 1 1 .
    . 1 f 1 1 f 1 .
    . 1 1 1 1 1 1 .
    . . 1 f f 1 . .
    . . 1 1 1 1 . .
`

const imgLanceRight = img`
    . . . . . . . . . . 1 1 . . . .
    e e e e e e e e e 1 1 1 1 . . .
    . . . . . . . . . . 1 1 . . . .
`
const imgLanceLeft = imgLanceRight.clone()
imgLanceLeft.flipX()

const imgDaggerRight = img`
    . . . . 1 1 . .
    4 4 1 1 1 1 1 1
    . . . . 1 1 . .
`
const imgDaggerLeft = imgDaggerRight.clone()
imgDaggerLeft.flipX()

const imgTorch = img`
    . . 5 5 . .
    . 5 4 4 5 .
    . . 2 2 . .
    . . e e . .
    . . e e . .
`

const imgFireball = img`
    . . 2 2 . .
    . 2 4 5 2 .
    2 4 5 5 4 2
    . 2 4 5 2 .
    . . 2 2 . .
`

const imgArmorPickup = img`
    . . 5 5 5 5 . .
    . 5 9 9 9 9 5 .
    5 9 1 9 9 1 9 5
    5 9 9 9 9 9 9 5
    . 5 9 9 9 9 5 .
    . . 5 5 5 5 . .
`

const imgWeaponBox = img`
    . 4 4 4 4 4 4 .
    4 5 5 5 5 5 5 4
    4 5 1 1 1 1 5 4
    4 5 1 2 2 1 5 4
    4 5 5 5 5 5 5 4
    . 4 4 4 4 4 4 .
`

// ==========================================
// 4. 스테이지 로더 (1판, 2판, 3판 배경 및 발판)
// ==========================================
let hero = sprites.create(imgKnightRight, SpriteKind.Player)
hero.ay = gravity
hero.setStayInScreen(true)
controller.moveSprite(hero, 100, 0)
info.setLife(3)
info.setScore(0)

let demon = sprites.create(imgDemonGround, SpriteKind.RLEnemy)
demon.ay = gravity * 0.85
demon.setStayInScreen(true)

function clearStageObjects() {
    for (let s of sprites.allOfKind(SpriteKind.Minion)) s.destroy()
    for (let s of sprites.allOfKind(SpriteKind.Weapon)) s.destroy()
    for (let s of sprites.allOfKind(SpriteKind.EnemyShot)) s.destroy()
    for (let s of sprites.allOfKind(SpriteKind.ArmorItem)) s.destroy()
    for (let s of sprites.allOfKind(SpriteKind.WeaponItem)) s.destroy()
}

function loadStage(stage: number) {
    isStageTransition = true
    clearStageObjects()
    stageKills = 0

    let bg = image.create(160, 120)

    if (stage == 1) {
        // STAGE 1: 저주받은 묘지
        bg.fill(15)
        bg.fillCircle(132, 22, 11, 2)
        bg.fillCircle(130, 21, 9, 4)
        bg.fillRect(24, 90, 6, 18, 11)
        bg.fillRect(20, 94, 14, 3, 11)
        bg.fillRect(118, 93, 8, 15, 11)
        bg.fillRect(0, GROUND_Y, 160, 12, 13)
        bg.fillRect(0, GROUND_Y, 160, 2, 7)

        platX = [12, 56, 108]
        platY = [80, 56, 80]
        platW = [40, 48, 40]
    } else if (stage == 2) {
        // STAGE 2: 불타는 마왕성
        bg.fill(12) // 어두운 보라
        // 성채 기둥
        bg.fillRect(15, 10, 14, 98, 11)
        bg.fillRect(131, 10, 14, 98, 11)
        // 창문 빛
        bg.fillRect(72, 20, 16, 26, 2)
        bg.fillRect(75, 23, 10, 20, 4)
        // 용암 바닥
        bg.fillRect(0, GROUND_Y, 160, 12, 2)
        bg.fillRect(0, GROUND_Y, 160, 2, 4)

        platX = [8, 52, 98, 56]
        platY = [82, 66, 82, 42]
        platW = [36, 40, 36, 48]
    } else {
        // STAGE 3: 마왕의 제단
        bg.fill(15)
        // 거대한 붉은 마법진 배경
        bg.drawCircle(80, 55, 36, 2)
        bg.drawCircle(80, 55, 24, 10)
        // 제단 바닥
        bg.fillRect(0, GROUND_Y, 160, 12, 11)
        bg.fillRect(0, GROUND_Y, 160, 2, 2)

        platX = [16, 104, 52]
        platY = [76, 76, 50]
        platW = [40, 40, 56]
    }

    // 발판 그리기
    for (let i = 0; i < platX.length; i++) {
        bg.fillRect(platX[i], platY[i], platW[i], 5, 11)
        bg.fillRect(platX[i], platY[i], platW[i], 2, stage == 2 ? 4 : 13)
    }
    scene.setBackgroundImage(bg)

    // 캐릭터 위치 및 적 체력 초기화 (Q-Table은 유지!)
    hero.setPosition(28, GROUND_Y - 10)
    hero.vx = 0
    hero.vy = 0

    enemyMaxHP = 4 + stage * 2
    enemyHP = enemyMaxHP
    demon.setPosition(132, 32)
    demon.vx = 0
    demon.vy = 0

    game.splash("STAGE " + stage, STAGE_TITLES[stage - 1])
    isStageTransition = false
}

// ==========================================
// 5. 발판 착지 판정 & 기존 컨트롤 구조 유지
// ==========================================
function isOnSurface(s: Sprite): boolean {
    if (s.bottom >= GROUND_Y) return true
    for (let i = 0; i < platX.length; i++) {
        if (Math.abs(s.bottom - platY[i]) <= 2 && s.right > platX[i] + 2 && s.left < platX[i] + platW[i] - 2) {
            return true
        }
    }
    return false
}

function handleSurfaceCollision(s: Sprite, prevBottom: number): boolean {
    if (s.bottom >= GROUND_Y) {
        s.bottom = GROUND_Y
        s.vy = 0
        return true
    }
    if (s.vy >= 0) {
        for (let i = 0; i < platX.length; i++) {
            if (prevBottom <= platY[i] + 2 && s.bottom >= platY[i]) {
                if (s.right > platX[i] + 2 && s.left < platX[i] + platW[i] - 2) {
                    s.bottom = platY[i]
                    s.vy = 0
                    return true
                }
            }
        }
    }
    return false
}

function attemptJump() {
    if (isOnSurface(hero)) {
        hero.vy = -4.2 * pixelsToMeters
    } else if (canDoubleJump) {
        doubleJumpSpeed = -3.2 * pixelsToMeters
        if (hero.vy >= -40) {
            doubleJumpSpeed = -4.5 * pixelsToMeters
            hero.startEffect(effects.trail, 250)
            scene.cameraShake(2, 120)
        }
        hero.vy = doubleJumpSpeed
        canDoubleJump = false
    }
}

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    attemptJump()
})

controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    attemptJump()
})

controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    if (!isOnSurface(hero)) {
        hero.vy += 85
    } else if (hero.bottom < GROUND_Y) {
        hero.y += 4
    }
})

// 무기 발사 (B 버튼)
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    let maxShots = weaponType == 1 ? 3 : 2
    if (sprites.allOfKind(SpriteKind.Weapon).length >= maxShots) return

    let dir = heroFacingLeft ? -1 : 1
    let proj: Sprite = null

    if (weaponType == 0) {
        proj = sprites.create(heroFacingLeft ? imgLanceLeft : imgLanceRight, SpriteKind.Weapon)
        proj.setPosition(hero.x, hero.y)
        proj.vx = dir * 165
    } else if (weaponType == 1) {
        proj = sprites.create(heroFacingLeft ? imgDaggerLeft : imgDaggerRight, SpriteKind.Weapon)
        proj.setPosition(hero.x, hero.y)
        proj.vx = dir * 210
    } else {
        proj = sprites.create(imgTorch, SpriteKind.Weapon)
        proj.setPosition(hero.x, hero.y - 2)
        proj.vx = dir * 95
        proj.vy = -125
        proj.ay = gravity
    }
    proj.setFlag(SpriteFlag.AutoDestroy, true)
    music.pewPew.play()
})

// ==========================================
// 6. 강화학습(Q-Learning + Experience Replay)
// ==========================================
function isWeaponThreat(): boolean {
    for (let w of sprites.allOfKind(SpriteKind.Weapon)) {
        let approaching = (w.vx > 0 && w.x < demon.x) || (w.vx < 0 && w.x > demon.x)
        if (approaching && Math.abs(w.x - demon.x) < 58 && Math.abs(w.y - demon.y) < 22) {
            return true
        }
    }
    return false
}

function getRLState(): number {
    let dist = Math.abs(demon.x - hero.x)
    let distBin = dist < 38 ? 0 : (dist < 85 ? 1 : 2)
    let dangerBin = isWeaponThreat() ? 1 : 0
    let dy = hero.y - demon.y
    let heightBin = Math.abs(dy) < 16 ? 0 : (dy < 0 ? 1 : 2)
    let airBin = isOnSurface(demon) ? 0 : 1

    return (((distBin * 2 + dangerBin) * 3 + heightBin) * 2) + airBin
}

function chooseAction(state: number): number {
    if (Math.random() < epsilon) {
        return Math.randomRange(0, NUM_ACTIONS - 1)
    }
    let bestAction = 0
    let bestVal = qTable[state * NUM_ACTIONS]
    for (let a = 1; a < NUM_ACTIONS; a++) {
        let val = qTable[state * NUM_ACTIONS + a]
        if (val > bestVal) {
            bestVal = val
            bestAction = a
        }
    }
    return bestAction
}

function updateQTable(prevState: number, action: number, reward: number, nextState: number) {
    let maxNextQ = qTable[nextState * NUM_ACTIONS]
    for (let a = 1; a < NUM_ACTIONS; a++) {
        let v = qTable[nextState * NUM_ACTIONS + a]
        if (v > maxNextQ) maxNextQ = v
    }
    let idx = prevState * NUM_ACTIONS + action
    qTable[idx] = qTable[idx] + alpha * (reward + gamma * maxNextQ - qTable[idx])
}

function addExperienceAndReplay(s: number, a: number, r: number, ns: number) {
    if (bufS.length < REPLAY_MAX) {
        bufS.push(s)
        bufA.push(a)
        bufR.push(r)
        bufNS.push(ns)
    } else {
        bufS[bufIdx] = s
        bufA[bufIdx] = a
        bufR[bufIdx] = r
        bufNS[bufIdx] = ns
        bufIdx = (bufIdx + 1) % REPLAY_MAX
    }
    for (let k = 0; k < 2; k++) {
        let rIdx = Math.randomRange(0, bufS.length - 1)
        updateQTable(bufS[rIdx], bufA[rIdx], bufR[rIdx], bufNS[rIdx])
    }
}

function executeDemonAction(action: number) {
    let dirToHero = hero.x < demon.x ? -1 : 1
    let speedBoost = 1 + (currentStage - 1) * 0.12 // 스테이지가 오를수록 소폭 빨라짐

    if (action == 0) {
        demon.vx = dirToHero * 60 * speedBoost
    } else if (action == 1) {
        demon.vx = -dirToHero * 55 * speedBoost
    } else if (action == 2) {
        demon.vy = -115
        demon.vx = -dirToHero * 25
    } else if (action == 3) {
        demon.vx = 0
        if (sprites.allOfKind(SpriteKind.EnemyShot).length < 2) {
            let fire = sprites.create(imgFireball, SpriteKind.EnemyShot)
            fire.setPosition(demon.x, demon.y)
            let dx = hero.x - demon.x
            let dy = hero.y - demon.y
            let len = Math.sqrt(dx * dx + dy * dy)
            let shotSpeed = 90 + currentStage * 8
            if (len > 0) {
                fire.vx = (dx / len) * shotSpeed
                fire.vy = (dy / len) * shotSpeed
            } else {
                fire.vx = dirToHero * shotSpeed
            }
            fire.setFlag(SpriteFlag.AutoDestroy, true)
        }
    } else if (action == 4) {
        demon.vx = dirToHero * 92 * speedBoost
        demon.vy = !isOnSurface(demon) ? 85 : -65
    }
}

// 0.22초마다 강화학습 의사결정
game.onUpdateInterval(220, function () {
    if (isStageTransition) return
    let currentState = getRLState()
    let nowInDanger = isWeaponThreat()

    if (wasInDanger && !nowInDanger && stepReward >= 0) {
        stepReward += 3.0
    }
    if (Math.abs(demon.x - hero.x) > 105) {
        stepReward -= 0.3
    } else {
        stepReward += 0.15
    }

    updateQTable(lastState, lastAction, stepReward, currentState)
    addExperienceAndReplay(lastState, lastAction, stepReward, currentState)
    stepReward = 0

    let action = chooseAction(currentState)
    executeDemonAction(action)

    lastState = currentState
    lastAction = action
    lastQVal = Math.round(qTable[currentState * NUM_ACTIONS + action])
    wasInDanger = nowInDanger

    if (epsilon > 0.06) {
        epsilon -= 0.0015
    }
})

// ==========================================
// 7. 무작위 소형 몬스터 스폰 (좀비 / 박쥐 / 점프 해골)
// ==========================================
game.onUpdateInterval(1200, function () {
    if (isStageTransition) return
    let maxMinions = currentStage + 1
    if (sprites.allOfKind(SpriteKind.Minion).length >= maxMinions) return

    // 스테이지가 높을수록 무작위 출현 확률 증가 (28% -> 42% -> 56%)
    if (!Math.percentChance(14 + currentStage * 14)) return

    let kind = Math.randomRange(0, 2)
    let fromLeft = Math.percentChance(50)

    if (kind == 0) {
        // 0: 묘지 좀비 (지상 출현)
        let z = sprites.create(imgZombie, SpriteKind.Minion)
        let spawnX = hero.x < 80 ? Math.randomRange(100, 150) : Math.randomRange(10, 60)
        z.setPosition(spawnX, GROUND_Y - 5)
        z.vx = (hero.x < spawnX ? -1 : 1) * Math.randomRange(22, 36)
        z.setFlag(SpriteFlag.AutoDestroy, true)
        z.startEffect(effects.ashes, 200)
    } else if (kind == 1) {
        // 1: 박쥐 (공중 횡단)
        let bat = sprites.create(imgBat, SpriteKind.Minion)
        bat.setPosition(fromLeft ? 4 : 156, Math.randomRange(24, 88))
        bat.vx = (fromLeft ? 1 : -1) * Math.randomRange(38, 58)
        bat.vy = Math.randomRange(-10, 10)
        bat.setFlag(SpriteFlag.AutoDestroy, true)
    } else {
        // 2: 점프 해골 (통통 튀며 접근)
        let skull = sprites.create(imgSkull, SpriteKind.Minion)
        skull.setPosition(fromLeft ? 6 : 154, GROUND_Y - 12)
        skull.vx = (fromLeft ? 1 : -1) * Math.randomRange(30, 48)
        skull.vy = -80
        skull.ay = gravity * 0.8
        skull.setFlag(SpriteFlag.AutoDestroy, true)
    }
})

// ==========================================
// 8. 충돌 처리 및 스테이지 클리어 판정
// ==========================================
function damageHero(fromRL: boolean) {
    if (isInvincible || isStageTransition) return
    isInvincible = true
    if (fromRL) stepReward += 15
    music.powerDown.play()

    if (armorState == 3) {
        armorState = 2
        hero.say("황금갑옷 파괴!", 600)
        hero.startEffect(effects.ashes, 300)
    } else if (armorState == 2) {
        armorState = 1
        hero.say("갑옷 파괴!", 600)
        hero.startEffect(effects.ashes, 300)
    } else {
        info.changeLifeBy(-1)
        armorState = 2
        hero.say("으악!", 600)
    }

    hero.vy = -70
    control.runInParallel(function () {
        for (let i = 0; i < 8; i++) {
            hero.setFlag(SpriteFlag.Invisible, i % 2 == 0)
            pause(invincibilityPeriod / 8)
        }
        hero.setFlag(SpriteFlag.Invisible, false)
        isInvincible = false
    })
}

sprites.onOverlap(SpriteKind.Player, SpriteKind.RLEnemy, function (sprite, otherSprite) {
    damageHero(true)
})

sprites.onOverlap(SpriteKind.Player, SpriteKind.EnemyShot, function (sprite, otherSprite) {
    otherSprite.destroy()
    damageHero(true)
})

sprites.onOverlap(SpriteKind.Player, SpriteKind.Minion, function (sprite, otherSprite) {
    otherSprite.destroy(effects.ashes, 150)
    damageHero(false)
})

sprites.onOverlap(SpriteKind.Player, SpriteKind.ArmorItem, function (sprite, item) {
    item.destroy()
    if (armorState < 3) armorState += 1
    info.changeScoreBy(10)
    music.powerUp.play()
    hero.say(armorState == 3 ? "황금 갑옷!" : "갑옷 회복!", 700)
})

sprites.onOverlap(SpriteKind.Player, SpriteKind.WeaponItem, function (sprite, item) {
    item.destroy()
    weaponType = (weaponType + 1) % 3
    info.changeScoreBy(5)
    music.powerUp.play()
    hero.say("무기:" + WEAPON_NAMES[weaponType], 700)
})

sprites.onOverlap(SpriteKind.Weapon, SpriteKind.Minion, function (weapon, m) {
    weapon.destroy()
    m.destroy(effects.fire, 150)
    info.changeScoreBy(5)
    music.baDing.play()
})

sprites.onOverlap(SpriteKind.Weapon, SpriteKind.RLEnemy, function (weapon, enemy) {
    weapon.destroy()
    let dmg = armorState == 3 ? 2 : 1
    enemyHP -= dmg
    stepReward -= 12
    enemy.startEffect(effects.fire, 150)
    music.baDing.play()

    if (enemyHP <= 0) {
        stageKills += 1
        totalKills += 1
        info.changeScoreBy(20)

        // 스테이지 목표 달성 시 다음 판으로 이동
        if (stageKills >= KILLS_PER_STAGE) {
            if (currentStage < MAX_STAGE) {
                currentStage += 1
                info.changeLifeBy(1)
                music.powerUp.play()
                loadStage(currentStage)
            } else {
                game.setGameOverEffect(true, effects.confetti)
                game.gameOver(true)
            }
            return
        }

        // 스테이지 내 리스폰 및 아이템 드롭
        enemyHP = enemyMaxHP
        if (Math.percentChance(45) && sprites.allOfKind(SpriteKind.ArmorItem).length == 0) {
            let armor = sprites.create(imgArmorPickup, SpriteKind.ArmorItem)
            armor.setPosition(enemy.x, enemy.y)
            armor.vy = -65
            armor.ay = gravity
            armor.lifespan = 6500
        } else if (Math.percentChance(60) && sprites.allOfKind(SpriteKind.WeaponItem).length == 0) {
            let wBox = sprites.create(imgWeaponBox, SpriteKind.WeaponItem)
            wBox.setPosition(enemy.x, enemy.y)
            wBox.vy = -65
            wBox.ay = gravity
            wBox.lifespan = 6500
        }

        enemy.setPosition(hero.x < 80 ? 142 : 18, 28)
        enemy.vx = 0
        enemy.vy = 0
        enemy.say("AI Lv." + totalKills, 700)
    }
})

// ==========================================
// 9. 매 프레임 업데이트 & 실시간 HUD
// ==========================================
game.onUpdate(function () {
    if (isStageTransition) return

    if (handleSurfaceCollision(hero, heroPrevBottom)) {
        canDoubleJump = true
    }
    heroPrevBottom = hero.bottom

    let demonGrounded = handleSurfaceCollision(demon, demonPrevBottom)
    demonPrevBottom = demon.bottom
    demon.setImage(demonGrounded ? imgDemonGround : imgDemonFly)

    // 점프 해골 바닥 바운스 처리
    for (let m of sprites.allOfKind(SpriteKind.Minion)) {
        if (m.ay > 0 && m.bottom >= GROUND_Y) {
            m.bottom = GROUND_Y
            m.vy = -Math.randomRange(85, 115)
        }
    }

    for (let item of sprites.allOfKind(SpriteKind.ArmorItem)) {
        if (item.bottom >= GROUND_Y) {
            item.bottom = GROUND_Y
            item.vy = 0
        }
    }
    for (let wBox of sprites.allOfKind(SpriteKind.WeaponItem)) {
        if (wBox.bottom >= GROUND_Y) {
            wBox.bottom = GROUND_Y
            wBox.vy = 0
        }
    }

    if (hero.vx < 0) heroFacingLeft = true
    else if (hero.vx > 0) heroFacingLeft = false

    if (armorState == 3) {
        hero.setImage(heroFacingLeft ? imgGoldLeft : imgGoldRight)
    } else if (armorState == 2) {
        hero.setImage(heroFacingLeft ? imgKnightLeft : imgKnightRight)
    } else {
        hero.setImage(heroFacingLeft ? imgBoxerLeft : imgBoxerRight)
    }
})

// 하단 HUD: 스테이지, 남은 격파 수, AI 행동, Q값
scene.createRenderable(100, function (target: Image, camera: scene.Camera) {
    let barW = 18
    let hpW = Math.max(0, Math.idiv(enemyHP * barW, enemyMaxHP))
    let bx = demon.x - 9
    let by = demon.top - 5
    target.fillRect(bx, by, barW, 3, 15)
    target.fillRect(bx, by, hpW, 3, 2)

    target.print("ST" + currentStage + " " + stageKills + "/" + KILLS_PER_STAGE + " " + ACTION_NAMES[lastAction] + " Q:" + lastQVal, 2, 111, 1)
})

// 게임 시작 (1판 로드)
loadStage(1)