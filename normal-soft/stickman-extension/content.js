;(() => {
  const KEY = "__stickman_ext__"
  if (window[KEY]) return

  let game = null
  let active = false

  class StickmanGame {
    constructor() {
      this.I = "__stickman_anim__"
      if (window[this.I]) {
        window[this.I].destroy()
        delete window[this.I]
      }
      this.particles = []
      this.shake = 0
    }

    start() {
      if (window[this.I]) return
      this.c = document.createElement("canvas")
      this.c.style.cssText =
        "position:fixed;left:0;top:0;pointer-events:none;z-index:999999"
      document.body.appendChild(this.c)
      this.x = this.c.getContext("2d")
      this.resize()
      this.resizeFn = this.resize.bind(this)
      addEventListener("resize", this.resizeFn)
      this.g = 0.6
      this.f = 0.85
      this.ms = 3
      this.jp = -12
      this.k = {}
      this.t = 0
      this.a = null
      this.dead = false
      this.spawnPos = this.centerSpawn()
      this.p = {
        x: this.spawnPos.x, y: this.spawnPos.y,
        vx: 0, vy: 0, w: 20, h: 40,
        onGround: false, dropping: false,
        hp: 100, maxHp: 100, inv: false,
      }
      this.it = []
      this.M = 5
      this.et = 0
      this.monsters = []
      this.maxMonsters = 3
      this.score = 0
      this.facing = 1
      this.attackCD = 0
      this.attackVis = 0
      this.invTimer = 0
      this.si = setInterval(() => this.spawn(), 4000)
      this.msi = setInterval(() => this.spawnMonster(), 4000)
      this.kdFn = this.kd.bind(this)
      this.kuFn = this.ku.bind(this)
      this.loopFn = this.loop.bind(this)
      addEventListener("keydown", this.kdFn, { passive: false })
      addEventListener("keyup", this.kuFn)
      this.platformsCache = []
      this.refreshPlatforms()
      this.scrollFn = () => this.refreshPlatforms()
      addEventListener("scroll", this.scrollFn, { passive: true })
      this.a = requestAnimationFrame(this.loopFn)
      window[this.I] = { destroy: this.destroy.bind(this) }
      for (let i = 0; i < 2; i++) this.spawnMonster()
    }

    refreshPlatforms() {
      this.platformsCache = [...document.querySelectorAll("body *")]
        .filter(e => e !== this.c)
        .map(e => e.getBoundingClientRect())
        .filter(r => r.width > 60 && r.height > 20)
    }

    resize() {
      this.c.width = innerWidth
      this.c.height = innerHeight
      this.refreshPlatforms()
    }

    centerSpawn() {
      let cx = innerWidth / 2
      let cy = innerHeight / 2
      let el = document.elementFromPoint(cx, cy)
      if (el) {
        let r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2 - 10, y: r.top + r.height / 2 - 20 }
      }
      return { x: cx - 10, y: cy - 20 }
    }

    spawn() {
      if (this.it.length >= this.M || this.dead) return
      this.it.push({
        x: Math.random() * (this.c.width - 30),
        y: Math.random() * (this.c.height - 200),
        s: 15, t: Math.floor(Math.random() * 4),
        bob: Math.random() * Math.PI * 2,
      })
    }

    spawnMonster() {
      if (this.monsters.length >= this.maxMonsters || this.dead) return
      let platforms = this.platformsCache
      if (!platforms.length) return
      let plat = platforms[Math.floor(Math.random() * platforms.length)]
      this.monsters.push({
        x: plat.left + Math.random() * Math.max(plat.width - 20, 1),
        y: plat.top - 20, w: 24, h: 24,
        hp: 3, maxHp: 3,
        spawnX: plat.left + Math.random() * Math.max(plat.width - 20, 1),
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: 0.8 + Math.random() * 1.2,
        rangeVal: 20 + Math.random() * 60,
        platTop: plat.top,
        bob: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3),
      })
    }

    eff(n) {
      this.et = 300
      if (n === 0) this.p.hp = Math.min(this.p.maxHp, this.p.hp + 30)
      if (n === 1) this.ms = 6
      if (n === 2) this.jp = -20
      if (n === 3) this.p.inv = true
    }

    reset() {
      this.ms = 3
      this.jp = -12
      this.p.inv = false
    }

    plats() {
      return this.platformsCache
    }

    col() {
      this.p.onGround = false
      for (let r of this.plats()) {
        if (
          this.p.x + this.p.w > r.left &&
          this.p.x < r.right &&
          this.p.y + this.p.h > r.top &&
          this.p.y + this.p.h < r.top + 15 &&
          this.p.vy >= 0 &&
          !this.p.dropping
        ) {
          this.p.y = r.top - this.p.h
          this.p.vy = 0
          this.p.onGround = true
        }
      }
    }

    pick() {
      for (let i = this.it.length - 1; i >= 0; i--) {
        let o = this.it[i]
        if (
          this.p.x < o.x + o.s &&
          this.p.x + this.p.w > o.x &&
          this.p.y < o.y + o.s &&
          this.p.y + this.p.h > o.y
        ) {
          this.eff(o.t)
          this.spawnParticles(o.x + 7, o.y + 7, this.itemColor(o.t), 12)
          this.it.splice(i, 1)
        }
      }
    }

    doAttack() {
      if (this.attackCD > 0 || this.dead) return
      this.attackCD = 15
      this.attackVis = 10
      let ax = this.facing === 1 ? this.p.x + this.p.w - 4 : this.p.x - 22
      let ay = this.p.y - 4
      let aw = 26, ah = 34
      for (let i = this.monsters.length - 1; i >= 0; i--) {
        let m = this.monsters[i]
        if (ax < m.x + m.w && ax + aw > m.x && ay < m.y + m.h && ay + ah > m.y) {
          m.hp--
          this.spawnParticles(m.x + m.w / 2, m.y + m.h / 2, "#ff4444", 6)
          if (m.hp <= 0) {
            this.spawnParticles(m.x + m.w / 2, m.y + m.h / 2, "#ff8800", 20)
            this.monsters.splice(i, 1)
            this.score += 100
            this.spawnMonster()
          }
        }
      }
    }

    updateMonsters() {
      for (let m of this.monsters) {
        m.x += m.dir * m.speed
        if (m.x > m.spawnX + m.rangeVal || m.x < m.spawnX - m.rangeVal) m.dir *= -1
        m.y = m.platTop - m.h
        m.bob += 0.05
      }
    }

    checkMonsterHit() {
      if (this.invTimer > 0) { this.invTimer--; return }
      if (this.p.inv) return
      for (let m of this.monsters) {
        if (this.p.x < m.x + m.w && this.p.x + this.p.w > m.x &&
            this.p.y < m.y + m.h && this.p.y + this.p.h > m.y) {
          this.p.hp -= 12
          this.invTimer = 40
          this.p.vx = this.p.x < m.x ? -4 : 4
          this.p.vy = -4
          this.shake = 8
          this.spawnParticles(this.p.x + 10, this.p.y + 20, "#ffffff", 8)
        }
      }
    }

    spawnParticles(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2
        let speed = 1 + Math.random() * 3
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 20 + Math.random() * 20,
          maxLife: 20 + Math.random() * 20,
          size: 2 + Math.random() * 3,
          color: color,
        })
      }
    }

    itemColor(t) {
      return t === 0 ? "#ff3366" : t === 1 ? "#ffcc00" : t === 2 ? "#00ddff" : "#ffdd00"
    }

    // ── Drawing helpers ──

    drawHeart(x, y, s) {
      this.x.save()
      this.x.translate(x, y)
      let hs = s / 2
      this.x.beginPath()
      this.x.moveTo(0, hs * 0.3)
      this.x.bezierCurveTo(-hs * 0.5, -hs * 0.3, -hs * 0.8, hs * 0.2, 0, hs * 0.9)
      this.x.bezierCurveTo(hs * 0.8, hs * 0.2, hs * 0.5, -hs * 0.3, 0, hs * 0.3)
      this.x.fill()
      this.x.restore()
    }

    drawStar(x, y, s) {
      this.x.save()
      this.x.translate(x, y)
      let r = s / 2
      this.x.beginPath()
      for (let i = 0; i < 5; i++) {
        let a = (i * 4 * Math.PI) / 5 - Math.PI / 2
        this.x[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r)
      }
      this.x.closePath()
      this.x.fill()
      this.x.restore()
    }

    drawBolt(x, y, s) {
      this.x.save()
      this.x.translate(x, y)
      let hs = s / 2
      this.x.beginPath()
      this.x.moveTo(hs * 0.4, -hs)
      this.x.lineTo(-hs * 0.2, -hs * 0.1)
      this.x.lineTo(hs * 0.1, -hs * 0.1)
      this.x.lineTo(-hs * 0.4, hs)
      this.x.lineTo(hs * 0.3, -hs * 0.25)
      this.x.lineTo(-hs * 0.05, -hs * 0.25)
      this.x.closePath()
      this.x.fill()
      this.x.restore()
    }

    drawSpring(x, y, s) {
      this.x.save()
      this.x.translate(x, y)
      let hs = s / 2
      this.x.beginPath()
      this.x.moveTo(-hs * 0.3, hs * 0.5)
      this.x.lineTo(hs * 0.3, hs * 0.1)
      this.x.lineTo(-hs * 0.3, -hs * 0.15)
      this.x.lineTo(hs * 0.3, -hs * 0.4)
      this.x.lineTo(0, -hs * 0.7)
      this.x.stroke()
      this.x.restore()
    }

    // ── Main drawing ──

    drawParticles() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        let p = this.particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.life--
        let alpha = p.life / p.maxLife
        this.x.globalAlpha = alpha
        this.x.fillStyle = p.color
        this.x.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        if (p.life <= 0) this.particles.splice(i, 1)
      }
      this.x.globalAlpha = 1
    }

    drawItem(o) {
      let bobY = Math.sin(o.bob + this.t * 0.05) * 2
      let cx = o.x + o.s / 2
      let cy = o.y + o.s / 2 + bobY

      this.x.save()

      let c = this.itemColor(o.t)
      this.x.shadowColor = c
      this.x.shadowBlur = 12
      this.x.fillStyle = c
      this.x.strokeStyle = "#fff"
      this.x.lineWidth = 1.5

      if (o.t === 0) {
        this.drawHeart(cx, cy, o.s)
      } else if (o.t === 1) {
        this.drawBolt(cx, cy, o.s)
      } else if (o.t === 2) {
        this.x.strokeStyle = c
        this.x.lineWidth = 2.5
        this.drawSpring(cx, cy, o.s)
      } else if (o.t === 3) {
        this.drawStar(cx, cy, o.s)
      }

      this.x.shadowBlur = 0
      this.x.restore()
    }

    drawMonster(m) {
      let bob = Math.sin(m.bob) * 2
      let cx = m.x + m.w / 2
      let cy = m.y + m.h / 2 + bob

      this.x.save()

      let colors = ["#8b0000", "#2d1b69", "#1a4a2a"]
      let baseColor = colors[m.type % colors.length]
      let lightColor = m.hp > m.maxHp / 2 ? baseColor : "#5a0000"

      this.x.fillStyle = lightColor
      this.x.shadowColor = baseColor
      this.x.shadowBlur = 8

      let r = m.w / 2
      this.x.beginPath()
      this.x.arc(cx, cy, r, 0, Math.PI * 2)
      this.x.fill()

      this.x.shadowBlur = 0

      this.x.fillStyle = baseColor
      this.x.beginPath()
      this.x.arc(cx, cy - r * 0.5, r * 0.3, 0, Math.PI, false)
      this.x.fill()

      this.x.fillStyle = "#fff"
      this.x.beginPath()
      this.x.arc(cx - r * 0.3, cy - r * 0.15, r * 0.25, 0, Math.PI * 2)
      this.x.arc(cx + r * 0.3, cy - r * 0.15, r * 0.25, 0, Math.PI * 2)
      this.x.fill()

      this.x.fillStyle = "#111"
      let eyeOff = m.dir * 2
      this.x.beginPath()
      this.x.arc(cx - r * 0.3 + eyeOff, cy - r * 0.15, r * 0.12, 0, Math.PI * 2)
      this.x.arc(cx + r * 0.3 + eyeOff, cy - r * 0.15, r * 0.12, 0, Math.PI * 2)
      this.x.fill()

      if (m.hp < m.maxHp) {
        let bw = m.w * 0.8
        this.x.fillStyle = "#333"
        this.x.fillRect(cx - bw / 2, m.y - 8, bw, 4)
        this.x.fillStyle = m.hp > 1 ? "#44cc44" : "#ff4444"
        this.x.fillRect(cx - bw / 2, m.y - 8, bw * (m.hp / m.maxHp), 4)
      }

      this.x.restore()
    }

    drawHUD() {
      let cw = this.c.width
      let ch = this.c.height

      this.x.save()

      // Score
      this.x.font = "bold 14px monospace"
      this.x.fillStyle = "rgba(255,255,255,0.85)"
      this.x.shadowColor = "#00f0ff"
      this.x.shadowBlur = 6
      this.x.fillText("SCORE " + this.score, 12, 22)
      this.x.shadowBlur = 0

      // Monster count
      this.x.font = "11px monospace"
      this.x.fillStyle = "rgba(255,255,255,0.5)"
      this.x.fillText("HOSTILES " + this.monsters.length + "/" + this.maxMonsters, 12, 40)

      // Health bar
      let hbW = 120, hbH = 10
      let hbX = cw - hbW - 14
      let hbY = 12
      let hpRatio = this.p.hp / this.p.maxHp

      this.x.fillStyle = "rgba(0,0,0,0.5)"
      this.x.fillRect(hbX - 1, hbY - 1, hbW + 2, hbH + 2)

      let hpColor = hpRatio > 0.6 ? "#44dd44" : hpRatio > 0.3 ? "#dddd44" : "#dd4444"
      this.x.fillStyle = hpColor
      this.x.shadowColor = hpColor
      this.x.shadowBlur = 6
      this.x.fillRect(hbX, hbY, hbW * hpRatio, hbH)
      this.x.shadowBlur = 0

      this.x.font = "9px monospace"
      this.x.fillStyle = "rgba(255,255,255,0.7)"
      this.x.textAlign = "center"
      this.x.fillText(Math.ceil(this.p.hp) + " / " + this.p.maxHp, hbX + hbW / 2, hbY + 9)
      this.x.textAlign = "start"

      // Power-up indicator
      if (this.et > 0) {
        let label = this.ms > 3 ? "SPEED" : this.jp < -12 ? "JUMP" : this.p.inv ? "SHIELD" : "HEAL"
        this.x.font = "bold 10px monospace"
        this.x.fillStyle = "#00f0ff"
        this.x.shadowColor = "#00f0ff"
        this.x.shadowBlur = 6
        this.x.fillText("BUFF " + label + " " + Math.ceil(this.et / 60) + "s", hbX, hbY + hbH + 14)
        this.x.shadowBlur = 0
      }

      this.x.restore()
    }

    drawCharacter() {
      let px = this.p.x
      let py = this.p.y
      let w = this.p.w
      let h = this.p.h
      let facing = this.facing
      let onGround = this.p.onGround

      let flash = this.invTimer > 0 && Math.floor(this.invTimer / 3) % 2
      if (flash) return

      this.x.save()

      let bodyColor = this.p.inv ? "#ffdd00" : "#ffffff"
      let strokeColor = "#222"
      let headR = 7
      let cx = px + w / 2

      // Head
      this.x.fillStyle = bodyColor
      this.x.strokeStyle = strokeColor
      this.x.lineWidth = 2
      this.x.beginPath()
      this.x.arc(cx, py + headR + 1, headR, 0, Math.PI * 2)
      this.x.fill()
      this.x.stroke()

      // Eyes
      this.x.fillStyle = "#222"
      let eyeX = facing === 1 ? 2 : -2
      this.x.beginPath()
      this.x.arc(cx + eyeX - 2, py + headR, 2, 0, Math.PI * 2)
      this.x.arc(cx + eyeX + 2, py + headR, 2, 0, Math.PI * 2)
      this.x.fill()

      // Body
      let bodyTop = py + headR * 2 + 2
      let bodyBot = py + h - 10
      let bodyMid = (bodyTop + bodyBot) / 2

      this.x.fillStyle = bodyColor
      this.x.strokeStyle = strokeColor
      this.x.lineWidth = 2
      let bw = 12
      this.x.fillRect(cx - bw / 2, bodyTop, bw, bodyBot - bodyTop)
      this.x.strokeRect(cx - bw / 2, bodyTop, bw, bodyBot - bodyTop)

      // Arms
      let armLen = 14
      let shoulderY = bodyTop + 4
      let armSwing = onGround ? Math.sin(this.t) * 0.6 : -0.8

      this.x.strokeStyle = strokeColor
      this.x.lineWidth = 2.5
      this.x.beginPath()
      this.x.moveTo(cx - bw / 2, shoulderY)
      this.x.lineTo(cx - bw / 2 - Math.cos(Math.PI / 2 - armSwing) * armLen,
                    shoulderY + Math.sin(Math.PI / 2 - armSwing) * armLen)
      this.x.stroke()

      this.x.beginPath()
      this.x.moveTo(cx + bw / 2, shoulderY)
      this.x.lineTo(cx + bw / 2 + Math.cos(Math.PI / 2 + armSwing) * armLen,
                    shoulderY + Math.sin(Math.PI / 2 + armSwing) * armLen)
      this.x.stroke()

      // Legs
      let legLen = 13
      let legSwing = onGround ? Math.sin(this.t) * 0.5 : -0.3

      this.x.strokeStyle = strokeColor
      this.x.lineWidth = 2.5
      this.x.beginPath()
      this.x.moveTo(cx - 3, bodyBot)
      this.x.lineTo(cx - 3 - Math.cos(Math.PI / 2 - legSwing) * legLen,
                    bodyBot + Math.sin(Math.PI / 2 - legSwing) * legLen)
      this.x.stroke()

      this.x.beginPath()
      this.x.moveTo(cx + 3, bodyBot)
      this.x.lineTo(cx + 3 + Math.cos(Math.PI / 2 + legSwing) * legLen,
                    bodyBot + Math.sin(Math.PI / 2 + legSwing) * legLen)
      this.x.stroke()

      // Attack visual
      if (this.attackVis > 0) {
        let sx = facing === 1 ? cx + bw / 2 : cx - bw / 2
        let sy = shoulderY + 4
        let slashLen = 24

        this.x.strokeStyle = "rgba(0, 240, 255, 0.9)"
        this.x.shadowColor = "#00f0ff"
        this.x.shadowBlur = 12
        this.x.lineWidth = 3
        this.x.beginPath()
        this.x.arc(sx + facing * 6, sy + 8, slashLen,
                   facing === 1 ? -0.8 : Math.PI - 0.8 + Math.PI,
                   facing === 1 ? 0.8 : Math.PI + 0.8)
        this.x.stroke()
        this.x.shadowBlur = 0
        this.x.lineWidth = 2
      }

      this.x.restore()
    }

    draw() {
      let cw = this.c.width
      let ch = this.c.height

      // Screen shake
      let sx = 0, sy = 0
      if (this.shake > 0) {
        sx = (Math.random() - 0.5) * this.shake * 2
        sy = (Math.random() - 0.5) * this.shake * 2
        this.shake--
      }

      this.x.save()
      this.x.translate(sx, sy)

      // Clear — fully transparent so the page DOM stays visible
      this.x.clearRect(-10, -10, cw + 20, ch + 20)

      // Platform outlines — helps the player see the terrain
      this.x.strokeStyle = "rgba(0, 240, 255, 0.15)"
      this.x.lineWidth = 1
      for (let r of this.platformsCache) {
        this.x.strokeRect(r.left, r.top, r.width, r.height)
      }

      // Items
      for (let o of this.it) this.drawItem(o)

      // Monsters
      for (let m of this.monsters) this.drawMonster(m)

      // Character
      this.drawCharacter()

      // Particles
      this.drawParticles()

      // HUD
      this.drawHUD()

      this.x.restore()
    }

    upd() {
      if (this.dead) return
      if (!this.p.inv) this.p.hp -= 0.01
      if (this.p.hp <= 0) return this.destroy()
      if (this.k.ArrowLeft) this.p.vx = -this.ms
      if (this.k.ArrowRight) this.p.vx = this.ms
      this.p.vx *= this.f
      this.p.vy += this.g
      this.p.x += this.p.vx
      this.p.y += this.p.vy
      this.col()
      this.pick()
      this.updateMonsters()
      this.checkMonsterHit()
      if (this.attackCD > 0) this.attackCD--
      if (this.attackVis > 0) this.attackVis--
      if (!this.k.ArrowDown) this.p.dropping = false
      if (this.p.y > innerHeight + 200) {
        this.p.y = -100
        this.p.vy = 0
      }
      if (this.et > 0 && !--this.et) this.reset()
      this.t += Math.abs(this.p.vx) * 0.15
    }

    loop() {
      this.upd()
      this.draw()
      this.a = requestAnimationFrame(this.loopFn)
    }

    kd(e) {
      let code = e.code || e.key
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code))
        e.preventDefault()
      if (code == " " || code == "Space") code = "Space"
      this.k[code] = true
      if (code === "ArrowUp" && this.p.onGround) this.p.vy = this.jp
      if (code === "ArrowDown" && this.p.onGround) {
        this.p.dropping = true
        this.p.vy = 5
      }
      if (code === "ArrowLeft") this.facing = -1
      if (code === "ArrowRight") this.facing = 1
      if (code === "Space" || code === "KeyZ" || code === "KeyX") this.doAttack()
    }

    ku(e) {
      let code = e.code || e.key
      if (code == " " || code == "Space") code = "Space"
      this.k[code] = false
    }

    destroy() {
      this.dead = true
      cancelAnimationFrame(this.a)
      clearInterval(this.si)
      clearInterval(this.msi)
      removeEventListener("keydown", this.kdFn)
      removeEventListener("keyup", this.kuFn)
      removeEventListener("resize", this.resizeFn)
      removeEventListener("scroll", this.scrollFn)
      this.particles = []
      this.shake = 0
      this.platformsCache = []
      this.c.remove()
      delete window[this.I]
    }
  }

  function startGame() {
    if (game) return
    game = new StickmanGame()
    game.start()
    active = true
  }

  function stopGame() {
    if (!game) return
    game.destroy()
    game = null
    active = false
  }

  function toggleGame() {
    if (active) stopGame()
    else startGame()
    return active
  }

  window[KEY] = { startGame, stopGame, toggleGame }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "toggle") {
      sendResponse({ active: toggleGame() })
    } else if (msg.type === "getState") {
      sendResponse({ active })
    }
  })
})()
