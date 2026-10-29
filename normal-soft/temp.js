javascript: (function () {
  const I = "__stickman_anim__"
  if (window[I]) {
    window[I].destroy()
    delete window[I]
    return
  }
  const c = document.createElement("canvas")
  c.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:999999"
  document.body.appendChild(c)
  const x = c.getContext("2d")
  let particles = [], shake = 0, platformsCache = []

  function refreshPlatforms() {
    platformsCache = [...document.querySelectorAll("body *")]
      .filter(e => e !== c)
      .map(e => e.getBoundingClientRect())
      .filter(r => r.width > 60 && r.height > 20)
  }

  function r() { c.width = innerWidth; c.height = innerHeight; refreshPlatforms() }
  r()
  addEventListener("resize", r)
  addEventListener("scroll", refreshPlatforms, { passive: true })
  let g = 0.6, f = 0.85, ms = 3, jp = -12, k = {}, t = 0, a, dead = !1,
    monsters = [], maxMonsters = 3, score = 0, facing = 1,
    attackCD = 0, attackVis = 0, invTimer = 0

  function centerSpawn() {
    let cx = innerWidth / 2, cy = innerHeight / 2, el = document.elementFromPoint(cx, cy)
    if (el) { let r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - 10, y: r.top + r.height / 2 - 20 } }
    return { x: cx - 10, y: cy - 20 }
  }
  let sp = centerSpawn()
  const p = { x: sp.x, y: sp.y, vx: 0, vy: 0, w: 20, h: 40, onGround: !1, dropping: !1, hp: 100, maxHp: 100, inv: !1 },
    it = [], M = 5
  let et = 0

  function spawn() {
    if (it.length >= M || dead) return
    it.push({ x: Math.random() * (c.width - 30), y: Math.random() * (c.height - 200), s: 15, t: Math.floor(Math.random() * 4), bob: Math.random() * Math.PI * 2 })
  }
  const si = setInterval(spawn, 4e3)

  function spawnMonster() {
    if (monsters.length >= maxMonsters || dead) return
    let platforms = platformsCache
    if (!platforms.length) return
    let plat = platforms[Math.floor(Math.random() * platforms.length)]
    monsters.push({
      x: plat.left + Math.random() * Math.max(plat.width - 20, 1), y: plat.top - 20, w: 24, h: 24,
      hp: 3, maxHp: 3, spawnX: plat.left + Math.random() * Math.max(plat.width - 20, 1),
      dir: Math.random() > 0.5 ? 1 : -1, speed: 0.8 + Math.random() * 1.2,
      rangeVal: 20 + Math.random() * 60, platTop: plat.top,
      bob: Math.random() * Math.PI * 2, type: Math.floor(Math.random() * 3),
    })
  }
  const msi = setInterval(spawnMonster, 4e3)
  for (let i = 0; i < 2; i++) spawnMonster()

  function eff(n) {
    et = 300
    n == 0 && (p.hp = Math.min(p.maxHp, p.hp + 30))
    n == 1 && (ms = 6)
    n == 2 && (jp = -20)
    n == 3 && (p.inv = !0)
  }
  function reset() { ms = 3; jp = -12; p.inv = !1 }
  function plats() {
    return platformsCache
  }
  function col() {
    p.onGround = !1
    for (let r of plats())
      if (p.x + p.w > r.left && p.x < r.right && p.y + p.h > r.top && p.y + p.h < r.top + 15 && p.vy >= 0 && !p.dropping)
        { p.y = r.top - p.h; p.vy = 0; p.onGround = !0 }
  }
  function pick() {
    for (let i = it.length - 1; i >= 0; i--) {
      let o = it[i]
      if (p.x < o.x + o.s && p.x + p.w > o.x && p.y < o.y + o.s && p.y + p.h > o.y) {
        eff(o.t)
        spawnParticles(o.x + 7, o.y + 7, itemColor(o.t), 12)
        it.splice(i, 1)
      }
    }
  }

  function doAttack() {
    if (attackCD > 0 || dead) return
    attackCD = 15; attackVis = 10
    let ax = facing == 1 ? p.x + p.w - 4 : p.x - 22, ay = p.y - 4, aw = 26, ah = 34
    for (let i = monsters.length - 1; i >= 0; i--) {
      let m = monsters[i]
      if (ax < m.x + m.w && ax + aw > m.x && ay < m.y + m.h && ay + ah > m.y) {
        m.hp--
        spawnParticles(m.x + m.w / 2, m.y + m.h / 2, "#ff4444", 6)
        if (m.hp <= 0) {
          spawnParticles(m.x + m.w / 2, m.y + m.h / 2, "#ff8800", 20)
          monsters.splice(i, 1); score += 100; spawnMonster()
        }
      }
    }
  }

  function updateMonsters() {
    for (let m of monsters) {
      m.x += m.dir * m.speed
      if (m.x > m.spawnX + m.rangeVal || m.x < m.spawnX - m.rangeVal) m.dir *= -1
      m.y = m.platTop - m.h; m.bob += 0.05
    }
  }

  function checkMonsterHit() {
    if (invTimer > 0) { invTimer--; return }
    if (p.inv) return
    for (let m of monsters) {
      if (p.x < m.x + m.w && p.x + p.w > m.x && p.y < m.y + m.h && p.y + p.h > m.y) {
        p.hp -= 12; invTimer = 40; p.vx = p.x < m.x ? -4 : 4; p.vy = -4; shake = 8
        spawnParticles(p.x + 10, p.y + 20, "#ffffff", 8)
      }
    }
  }

  function spawnParticles(px, py, color, count) {
    for (let i = 0; i < count; i++) {
      let a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 3
      particles.push({ x: px, y: py, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1, life: 20 + Math.random() * 20, maxLife: 20 + Math.random() * 20, size: 2 + Math.random() * 3, color })
    }
  }

  function itemColor(t) { return t === 0 ? "#ff3366" : t === 1 ? "#ffcc00" : t === 2 ? "#00ddff" : "#ffdd00" }

  function drawHeart(x, y, s) {
    x.save(); x.translate(x, y); let hs = s / 2
    x.beginPath(); x.moveTo(0, hs * 0.3)
    x.bezierCurveTo(-hs * 0.5, -hs * 0.3, -hs * 0.8, hs * 0.2, 0, hs * 0.9)
    x.bezierCurveTo(hs * 0.8, hs * 0.2, hs * 0.5, -hs * 0.3, 0, hs * 0.3)
    x.fill(); x.restore()
  }

  function drawStar(x, y, s) {
    x.save(); x.translate(x, y); let r = s / 2
    x.beginPath()
    for (let i = 0; i < 5; i++) {
      let a = (i * 4 * Math.PI) / 5 - Math.PI / 2
      x[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r)
    }
    x.closePath(); x.fill(); x.restore()
  }

  function drawBolt(x, y, s) {
    x.save(); x.translate(x, y); let hs = s / 2
    x.beginPath()
    x.moveTo(hs * 0.4, -hs); x.lineTo(-hs * 0.2, -hs * 0.1)
    x.lineTo(hs * 0.1, -hs * 0.1); x.lineTo(-hs * 0.4, hs)
    x.lineTo(hs * 0.3, -hs * 0.25); x.lineTo(-hs * 0.05, -hs * 0.25)
    x.closePath(); x.fill(); x.restore()
  }

  function drawSpring(x, y, s) {
    x.save(); x.translate(x, y); let hs = s / 2
    x.beginPath()
    x.moveTo(-hs * 0.3, hs * 0.5); x.lineTo(hs * 0.3, hs * 0.1)
    x.lineTo(-hs * 0.3, -hs * 0.15); x.lineTo(hs * 0.3, -hs * 0.4)
    x.lineTo(0, -hs * 0.7); x.stroke(); x.restore()
  }

  function drawItem(o) {
    let bobY = Math.sin(o.bob + t * 0.05) * 2, cx = o.x + o.s / 2, cy = o.y + o.s / 2 + bobY
    x.save(); let c = itemColor(o.t)
    x.shadowColor = c; x.shadowBlur = 12; x.fillStyle = c; x.strokeStyle = "#fff"; x.lineWidth = 1.5
    o.t === 0 ? drawHeart(cx, cy, o.s) :
    o.t === 1 ? drawBolt(cx, cy, o.s) :
    o.t === 2 ? (x.strokeStyle = c, x.lineWidth = 2.5, drawSpring(cx, cy, o.s)) :
    drawStar(cx, cy, o.s)
    x.shadowBlur = 0; x.restore()
  }

  function drawMonster(m) {
    let bob = Math.sin(m.bob) * 2, cx = m.x + m.w / 2, cy = m.y + m.h / 2 + bob
    x.save()
    let colors = ["#8b0000", "#2d1b69", "#1a4a2a"], baseColor = colors[m.type % colors.length]
    x.fillStyle = m.hp > m.maxHp / 2 ? baseColor : "#5a0000"
    x.shadowColor = baseColor; x.shadowBlur = 8
    let r = m.w / 2
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.shadowBlur = 0

    x.fillStyle = baseColor
    x.beginPath(); x.arc(cx, cy - r * 0.5, r * 0.3, 0, Math.PI, !1); x.fill()

    x.fillStyle = "#fff"
    x.beginPath(); x.arc(cx - r * 0.3, cy - r * 0.15, r * 0.25, 0, Math.PI * 2)
    x.arc(cx + r * 0.3, cy - r * 0.15, r * 0.25, 0, Math.PI * 2); x.fill()

    x.fillStyle = "#111"; let eyeOff = m.dir * 2
    x.beginPath(); x.arc(cx - r * 0.3 + eyeOff, cy - r * 0.15, r * 0.12, 0, Math.PI * 2)
    x.arc(cx + r * 0.3 + eyeOff, cy - r * 0.15, r * 0.12, 0, Math.PI * 2); x.fill()

    if (m.hp < m.maxHp) {
      let bw = m.w * 0.8
      x.fillStyle = "#333"; x.fillRect(cx - bw / 2, m.y - 8, bw, 4)
      x.fillStyle = m.hp > 1 ? "#44cc44" : "#ff4444"
      x.fillRect(cx - bw / 2, m.y - 8, bw * (m.hp / m.maxHp), 4)
    }
    x.restore()
  }

  function drawCharacter() {
    let px = p.x, py = p.y, w = p.w, h = p.h, fc = facing, onGround = p.onGround
    let flash = invTimer > 0 && Math.floor(invTimer / 3) % 2
    if (flash) return
    x.save()
    let bodyColor = p.inv ? "#ffdd00" : "#fff", strokeColor = "#222", headR = 7, cx = px + w / 2

    x.fillStyle = bodyColor; x.strokeStyle = strokeColor; x.lineWidth = 2
    x.beginPath(); x.arc(cx, py + headR + 1, headR, 0, Math.PI * 2); x.fill(); x.stroke()

    x.fillStyle = "#222"; let eyeX = fc === 1 ? 2 : -2
    x.beginPath(); x.arc(cx + eyeX - 2, py + headR, 2, 0, Math.PI * 2)
    x.arc(cx + eyeX + 2, py + headR, 2, 0, Math.PI * 2); x.fill()

    let bodyTop = py + headR * 2 + 2, bodyBot = py + h - 10, bw = 12
    x.fillStyle = bodyColor; x.strokeStyle = strokeColor; x.lineWidth = 2
    x.fillRect(cx - bw / 2, bodyTop, bw, bodyBot - bodyTop)
    x.strokeRect(cx - bw / 2, bodyTop, bw, bodyBot - bodyTop)

    let armLen = 14, shoulderY = bodyTop + 4, armSwing = onGround ? Math.sin(t) * 0.6 : -0.8
    x.strokeStyle = strokeColor; x.lineWidth = 2.5
    x.beginPath(); x.moveTo(cx - bw / 2, shoulderY)
    x.lineTo(cx - bw / 2 - Math.cos(Math.PI / 2 - armSwing) * armLen, shoulderY + Math.sin(Math.PI / 2 - armSwing) * armLen)
    x.stroke()
    x.beginPath(); x.moveTo(cx + bw / 2, shoulderY)
    x.lineTo(cx + bw / 2 + Math.cos(Math.PI / 2 + armSwing) * armLen, shoulderY + Math.sin(Math.PI / 2 + armSwing) * armLen)
    x.stroke()

    let legLen = 13, legSwing = onGround ? Math.sin(t) * 0.5 : -0.3
    x.strokeStyle = strokeColor; x.lineWidth = 2.5
    x.beginPath(); x.moveTo(cx - 3, bodyBot)
    x.lineTo(cx - 3 - Math.cos(Math.PI / 2 - legSwing) * legLen, bodyBot + Math.sin(Math.PI / 2 - legSwing) * legLen)
    x.stroke()
    x.beginPath(); x.moveTo(cx + 3, bodyBot)
    x.lineTo(cx + 3 + Math.cos(Math.PI / 2 + legSwing) * legLen, bodyBot + Math.sin(Math.PI / 2 + legSwing) * legLen)
    x.stroke()

    if (attackVis > 0) {
      let sx = fc === 1 ? cx + bw / 2 : cx - bw / 2, sy = shoulderY + 4
      x.strokeStyle = "rgba(0, 240, 255, 0.9)"; x.shadowColor = "#00f0ff"; x.shadowBlur = 12; x.lineWidth = 3
      x.beginPath()
      x.arc(sx + fc * 6, sy + 8, 24, fc === 1 ? -0.8 : Math.PI - 0.8 + Math.PI, fc === 1 ? 0.8 : Math.PI + 0.8)
      x.stroke(); x.shadowBlur = 0; x.lineWidth = 2
    }
    x.restore()
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--
      x.globalAlpha = p.life / p.maxLife; x.fillStyle = p.color
      x.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      if (p.life <= 0) particles.splice(i, 1)
    }
    x.globalAlpha = 1
  }

  function drawHUD() {
    x.save()
    x.font = "bold 14px monospace"; x.fillStyle = "rgba(255,255,255,0.85)"
    x.shadowColor = "#00f0ff"; x.shadowBlur = 6
    x.fillText("SCORE " + score, 12, 22); x.shadowBlur = 0

    x.font = "11px monospace"; x.fillStyle = "rgba(255,255,255,0.5)"
    x.fillText("HOSTILES " + monsters.length + "/" + maxMonsters, 12, 40)

    let hbW = 120, hbH = 10, hbX = c.width - hbW - 14, hbY = 12, hpRatio = p.hp / p.maxHp
    x.fillStyle = "rgba(0,0,0,0.5)"; x.fillRect(hbX - 1, hbY - 1, hbW + 2, hbH + 2)
    let hpColor = hpRatio > 0.6 ? "#44dd44" : hpRatio > 0.3 ? "#dddd44" : "#dd4444"
    x.fillStyle = hpColor; x.shadowColor = hpColor; x.shadowBlur = 6
    x.fillRect(hbX, hbY, hbW * hpRatio, hbH); x.shadowBlur = 0

    x.font = "9px monospace"; x.fillStyle = "rgba(255,255,255,0.7)"
    x.textAlign = "center"; x.fillText(Math.ceil(p.hp) + " / " + p.maxHp, hbX + hbW / 2, hbY + 9)
    x.textAlign = "start"

    if (et > 0) {
      let label = ms > 3 ? "SPEED" : jp < -12 ? "JUMP" : p.inv ? "SHIELD" : "HEAL"
      x.font = "bold 10px monospace"; x.fillStyle = "#00f0ff"; x.shadowColor = "#00f0ff"; x.shadowBlur = 6
      x.fillText("BUFF " + label + " " + Math.ceil(et / 60) + "s", hbX, hbY + hbH + 14)
      x.shadowBlur = 0
    }
    x.restore()
  }

  function draw() {
    let sx = 0, sy = 0
    if (shake > 0) { sx = (Math.random() - 0.5) * shake * 2; sy = (Math.random() - 0.5) * shake * 2; shake-- }
    x.save(); x.translate(sx, sy)

    x.clearRect(-10, -10, c.width + 20, c.height + 20)

    x.strokeStyle = "rgba(0, 240, 255, 0.15)"; x.lineWidth = 1
    for (let r of platformsCache) { x.strokeRect(r.left, r.top, r.width, r.height) }

    for (let o of it) drawItem(o)
    for (let m of monsters) drawMonster(m)
    drawCharacter()
    drawParticles()
    drawHUD()
    x.restore()
  }

  function upd() {
    if (dead) return
    if (!p.inv) p.hp -= 0.01
    if (p.hp <= 0) return destroy()
    k.ArrowLeft && (p.vx = -ms); k.ArrowRight && (p.vx = ms)
    p.vx *= f; p.vy += g; p.x += p.vx; p.y += p.vy; col(); pick()
    updateMonsters(); checkMonsterHit()
    if (attackCD > 0) attackCD--
    if (attackVis > 0) attackVis--
    k.ArrowDown || (p.dropping = !1)
    p.y > innerHeight + 200 && ((p.y = -100), (p.vy = 0))
    if (et > 0 && !--et) reset()
    t += Math.abs(p.vx) * 0.15
  }

  function destroy() {
    dead = !0; cancelAnimationFrame(a); clearInterval(si); clearInterval(msi)
    removeEventListener("keydown", kd); removeEventListener("keyup", ku); removeEventListener("resize", r); removeEventListener("scroll", refreshPlatforms)
    particles = []; shake = 0; platformsCache = []; c.remove(); delete window[I]
  }

  function loop() { upd(); draw(); a = requestAnimationFrame(loop) }

  function kd(e) {
    let code = e.code || e.key
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(code)) e.preventDefault()
    if (code == " " || code == "Space") code = "Space"
    k[code] = !0
    if (code == "ArrowUp" && p.onGround) p.vy = jp
    if (code == "ArrowDown" && p.onGround) { p.dropping = !0; p.vy = 5 }
    if (code == "ArrowLeft") { facing = -1 }; if (code == "ArrowRight") { facing = 1 }
    if (code == "Space" || code == "KeyZ" || code == "KeyX") doAttack()
  }

  function ku(e) {
    let code = e.code || e.key
    if (code == " " || code == "Space") code = "Space"; k[code] = !1
  }

  addEventListener("keydown", kd, { passive: !1 }); addEventListener("keyup", ku)
  addEventListener("click", () => {}, { once: !0 })
  a = requestAnimationFrame(loop)
  window[I] = { destroy }
})()
