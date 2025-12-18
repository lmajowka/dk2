import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    backgroundUrl: String,
    spriteUrl: String,
    punchUrl: String,
    tileUrls: Array,
    goalTileId: Number,
    map: Array,
    levelCols: Number,
    props: Array,
    propUrls: Array,
    enemies: Array,
    enemyUrl: String,
  }

  connect() {
    this.canvas = this.element
    this.ctx = this.canvas.getContext("2d")

    this.grid = this.mapValue

    this.background = new Image()
    this.background.src = this.backgroundUrlValue

    this.frameWidth = 64
    this.frameHeight = 64

    // Criar elemento <img> para o gif animado
    this.setupSpriteElement()

    this.tileImages = []
    this.tilesLoaded = 0

    const urls = this.hasTileUrlsValue ? this.tileUrlsValue : []
    this.tileCount = urls.length

    const onAllTilesLoaded = () => {
      const firstTile = this.tileImages[1]
      if (firstTile) {
        this.tileWidth = firstTile.naturalWidth || firstTile.width
        this.tileHeight = firstTile.naturalHeight || firstTile.height
      } else {
        this.tileWidth = 64
        this.tileHeight = 64
      }

      if (this.grid) {
        this.mapHeightPx = this.grid.length * this.tileHeight
        this.deathY = this.mapHeightPx + 200
      }

      this.respawn()
    }

    if (urls.length === 0) {
      this.tileWidth = 64
      this.tileHeight = 64
      if (this.grid) {
        this.mapHeightPx = this.grid.length * this.tileHeight
        this.deathY = this.mapHeightPx + 200
      }
      this.respawn()
    } else {
      urls.forEach((url, index) => {
        const img = new Image()
        img.onload = () => {
          this.tilesLoaded++
          if (this.tilesLoaded === this.tileCount) {
            onAllTilesLoaded()
          }
        }
        img.onerror = () => console.error(`Failed to load tile${index + 1} image`, url)
        img.src = url
        this.tileImages[index + 1] = img
      })
    }

    // Load props
    this.props = this.hasPropsValue ? this.propsValue : []
    this.propImages = {}
    const propUrls = this.hasPropUrlsValue ? this.propUrlsValue : []

    propUrls.forEach((propData) => {
      const img = new Image()
      img.src = propData.url
      this.propImages[propData.id] = img
    })

    this.worldX = this.canvas.width / 2
    this.cameraX = 0
    this.x = this.worldX
    this.worldY = this.canvas.height - this.frameHeight - 10
    this.y = this.worldY
    this.vy = 0
    this.onGround = false
    this.gravity = 1800
    this.jumpVelocity = 700
    this.deathY = this.canvas.height + 200
    this.cameraY = 0
    this.maxLives = 3
    this.lives = this.maxLives
    this.maxHealth = 100
    this.health = this.maxHealth
    this.currentFrame = 0
    this.direction = "right"
    this.walking = false
    this.spriteIsPaused = false
    this.punching = false
    this.punchTimer = 0
    this.levelEnded = false
    this.levelEndedTime = 0

    this.speed = 180

    this.keys = { left: false, right: false }

    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)

    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("keyup", this.onKeyUp)

    this.lastTimestamp = 0
    this.rafId = requestAnimationFrame(this.loop.bind(this))

    this.setupHealthBarElement()
    this.setupEnemies()

    // Damage immunity
    this.damageImmune = false
    this.damageImmuneTimer = 0
  }

  setupSpriteElement() {
    // Garantir que o canvas tenha position relative para o img absolute funcionar
    const parent = this.canvas.parentNode
    const computedStyle = window.getComputedStyle(parent)
    if (computedStyle.position === "static") {
      parent.style.position = "relative"
    }

    // Elemento img para o gif animado
    this.spriteEl = document.createElement("img")
    this.spriteEl.src = this.spriteUrlValue
    this.spriteEl.style.position = "absolute"
    this.spriteEl.style.width = `${this.frameWidth}px`
    this.spriteEl.style.height = `${this.frameHeight}px`
    this.spriteEl.style.pointerEvents = "none"
    this.spriteEl.style.imageRendering = "pixelated"
    parent.appendChild(this.spriteEl)

    // Canvas oculto para capturar frame quando parado
    this.spriteCanvas = document.createElement("canvas")
    this.spriteCanvas.width = this.frameWidth
    this.spriteCanvas.height = this.frameHeight
    this.spriteCtx = this.spriteCanvas.getContext("2d")

    // Capturar primeiro frame quando gif carregar
    this.spriteEl.onload = () => {
      this.captureStaticFrame()
    }
  }

  setupHealthBarElement() {
    const parent = this.canvas.parentNode
    const barContainer = document.createElement("div")
    barContainer.style.position = "absolute"
    barContainer.style.top = "10px"
    barContainer.style.left = "10px"
    barContainer.style.width = "200px"
    barContainer.style.height = "20px"
    barContainer.style.border = "2px solid #000"
    barContainer.style.backgroundColor = "rgba(0, 0, 0, 0.4)"

    const barFill = document.createElement("div")
    barFill.style.height = "100%"
    barFill.style.width = "100%"
    barFill.style.backgroundColor = "#e53935"

    barContainer.appendChild(barFill)
    parent.appendChild(barContainer)

    this.healthBarContainer = barContainer
    this.healthBarFill = barFill
    this.updateHealthBar()
  }

  updateHealthBar() {
    if (!this.healthBarFill || !this.maxHealth) return

    const clampedHealth = Math.max(0, Math.min(this.health, this.maxHealth))
    const percent = (clampedHealth / this.maxHealth) * 100
    this.healthBarFill.style.width = `${percent}%`
  }

  takeDamage(amount) {
    if (amount <= 0) return
    if (this.damageImmune) return

    this.health -= amount
    this.damageImmune = true
    this.damageImmuneTimer = 2000

    if (this.health <= 0) {
      this.health = 0
      this.loseLifeAndRestart()
      return
    }

    this.updateHealthBar()
  }

  setupEnemies() {
    const enemyData = this.hasEnemiesValue ? this.enemiesValue : []
    const enemyUrl = this.hasEnemyUrlValue ? this.enemyUrlValue : ""

    this.enemyWidth = 96
    this.enemyHeight = 96
    this.enemyOffsetY = 32
    this.enemySprites = []

    if (!enemyUrl || enemyData.length === 0) return

    const parent = this.canvas.parentNode

    enemyData.forEach((enemy, index) => {
      const el = document.createElement("img")
      el.src = enemyUrl
      el.style.position = "absolute"
      el.style.width = `${this.enemyWidth}px`
      el.style.height = `${this.enemyHeight}px`
      el.style.pointerEvents = "none"
      el.style.imageRendering = "pixelated"
      parent.appendChild(el)

      this.enemySprites.push({
        el,
        worldX: enemy.x,
        worldY: enemy.y,
        direction: "left",
        speed: 50 + Math.random() * 30,
      })
    })
  }

  updateEnemies(dt) {
    if (!this.enemySprites || this.enemySprites.length === 0) return

    this.enemySprites.forEach((enemy) => {
      const dx = this.worldX - enemy.worldX
      if (dx > 0) {
        enemy.worldX += enemy.speed * dt
        enemy.direction = "right"
      } else if (dx < 0) {
        enemy.worldX -= enemy.speed * dt
        enemy.direction = "left"
      }

      this.applyEnemyGravity(enemy, dt)
      this.checkEnemyCollision(enemy)
    })
  }

  applyEnemyGravity(enemy, dt) {
    if (!enemy.vy) enemy.vy = 0

    enemy.vy += this.gravity * dt
    enemy.worldY += enemy.vy * dt

    const feetY = enemy.worldY + this.enemyHeight
    const footInset = 6
    const footLeftX = enemy.worldX + footInset
    const footRightX = enemy.worldX + this.enemyWidth - footInset

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileHeight)

    const supported = this.isSolid(rowUnder, leftCol) || this.isSolid(rowUnder, rightCol)
    if (supported && enemy.vy >= 0) {
      enemy.worldY = rowUnder * this.tileHeight - this.enemyHeight
      enemy.vy = 0
    }
  }

  checkEnemyCollision(enemy) {
    const playerLeft = this.worldX
    const playerRight = this.worldX + this.frameWidth
    const playerTop = this.worldY
    const playerBottom = this.worldY + this.frameHeight

    const enemyLeft = enemy.worldX
    const enemyRight = enemy.worldX + this.enemyWidth
    const enemyTop = enemy.worldY
    const enemyBottom = enemy.worldY + this.enemyHeight

    const overlap =
      playerLeft < enemyRight &&
      playerRight > enemyLeft &&
      playerTop < enemyBottom &&
      playerBottom > enemyTop

    if (overlap) {
      this.takeDamage(10)
    }
  }

  drawEnemies() {
    if (!this.enemySprites || this.enemySprites.length === 0) return

    const canvasRect = this.canvas.getBoundingClientRect()
    const parentRect = this.canvas.parentNode.getBoundingClientRect()
    const offsetX = canvasRect.left - parentRect.left
    const offsetY = canvasRect.top - parentRect.top

    this.enemySprites.forEach((enemy) => {
      const screenX = enemy.worldX - this.cameraX
      const screenY = enemy.worldY - this.cameraY + this.enemyOffsetY

      enemy.el.style.left = `${offsetX + screenX}px`
      enemy.el.style.top = `${offsetY + screenY}px`
      enemy.el.style.transform = enemy.direction === "left" ? "scaleX(-1)" : "scaleX(1)"
    })
  }

  captureStaticFrame() {
    if (this.spriteEl.complete) {
      this.spriteCtx.clearRect(0, 0, this.frameWidth, this.frameHeight)
      this.spriteCtx.drawImage(this.spriteEl, 0, 0, this.frameWidth, this.frameHeight)
      this.staticFrameUrl = this.spriteCanvas.toDataURL()
    }
  }

  updateSpriteAnimation() {
    if (!this.spriteEl) return

    // Punching takes priority
    if (this.punching) {
      return
    }

    if (this.walking) {
      // Andando: mostrar gif animado (com timestamp para forçar reload e reiniciar animação)
      if (this.spriteIsPaused) {
        this.spriteEl.src = this.spriteUrlValue + "?t=" + Date.now()
        this.spriteIsPaused = false
      }
    } else {
      // Parado: capturar frame atual e mostrar imagem estática
      if (!this.spriteIsPaused) {
        this.captureStaticFrame()
        if (this.staticFrameUrl) {
          this.spriteEl.src = this.staticFrameUrl
          this.spriteIsPaused = true
        }
      }
    }
  }

  startPunch() {
    this.punching = true
    this.punchTimer = 1500
    this.prePunchSrc = this.spriteEl.src
    this.spriteEl.src = this.punchUrlValue + "?t=" + Date.now()
  }

  updatePunch(delta) {
    if (!this.punching) return

    this.punchTimer -= delta
    if (this.punchTimer <= 0) {
      this.punching = false
      this.punchTimer = 0
      // Restore previous animation state
      if (this.walking) {
        this.spriteEl.src = this.spriteUrlValue + "?t=" + Date.now()
        this.spriteIsPaused = false
      } else if (this.staticFrameUrl) {
        this.spriteEl.src = this.staticFrameUrl
        this.spriteIsPaused = true
      } else {
        this.spriteEl.src = this.spriteUrlValue
        this.spriteIsPaused = false
      }
    }
  }

  disconnect() {
    window.removeEventListener("keydown", this.onKeyDown)
    window.removeEventListener("keyup", this.onKeyUp)

    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }

    if (this.spriteEl && this.spriteEl.parentNode) {
      this.spriteEl.remove()
    }

    if (this.healthBarContainer && this.healthBarContainer.parentNode) {
      this.healthBarContainer.remove()
    }

    if (this.enemySprites) {
      this.enemySprites.forEach((enemy) => {
        if (enemy.el && enemy.el.parentNode) {
          enemy.el.remove()
        }
      })
    }
  }

  onKeyDown(e) {
    if (e.key === "ArrowLeft") {
      this.keys.left = true
      this.direction = "left"
      this.walking = true
    } else if (e.key === "ArrowRight") {
      this.keys.right = true
      this.direction = "right"
      this.walking = true
    } else if (e.code === "Space") {
      if (this.onGround) {
        this.vy = -this.jumpVelocity
        this.onGround = false
      }
    } else if (e.key === "s" || e.key === "S") {
      if (!this.punching && this.hasPunchUrlValue) {
        this.startPunch()
      }
    }
  }

  onKeyUp(e) {
    if (e.key === "ArrowLeft") {
      this.keys.left = false
    } else if (e.key === "ArrowRight") {
      this.keys.right = false
    }

    if (!this.keys.left && !this.keys.right) {
      this.walking = false
      this.currentFrame = 0
    }
  }

  loop(timestamp) {
    const delta = timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp

    this.update(delta)

    this.draw()

    this.rafId = requestAnimationFrame(this.loop.bind(this))
  }

  update(delta) {
    if (this.levelEnded) {
      this.levelEndedTime += delta
      return
    }

    this.updatePunch(delta)

    const dt = delta / 1000

    if (this.keys.left) {
      this.worldX -= this.speed * dt
    }
    if (this.keys.right) {
      this.worldX += this.speed * dt
    }

    const levelWidthPx = this.getLevelWidthPx()
    if (levelWidthPx != null) {
      const maxWorldX = Math.max(0, levelWidthPx - this.frameWidth)
      if (this.worldX < 0) this.worldX = 0
      if (this.worldX > maxWorldX) this.worldX = maxWorldX
    } else {
      if (this.worldX < 0) this.worldX = 0
    }

    this.updateCamera()

    this.vy += this.gravity * dt
    this.worldY += this.vy * dt

    this.resolveGroundCollision()

    this.checkGoalReached()

    if (this.worldY > this.deathY) {
      this.loseLifeAndRestart()
      return
    }

    // Update damage immunity timer
    if (this.damageImmune && this.damageImmuneTimer > 0) {
      this.damageImmuneTimer -= delta
      if (this.damageImmuneTimer <= 0) {
        this.damageImmune = false
        this.damageImmuneTimer = 0
      }
    }

    this.updateEnemies(dt)
    this.updateHealthBar()
  }

  getLevelWidthPx() {
    if (!this.tileWidth) return null

    if (this.grid) {
      const rows = this.grid.length
      const cols = rows > 0 ? this.grid[0].length : 0
      return cols * this.tileWidth
    }

    return null
  }

  tileAt(row, col) {
    if (!this.grid) return 0
    if (row < 0 || col < 0) return 0
    if (row >= this.grid.length) return 0
    if (col >= this.grid[0].length) return 0
    return this.grid[row][col]
  }

  isSolid(row, col) {
    const t = this.tileAt(row, col)
    return t > 0
  }

  isGoal(row, col) {
    const goalId = this.hasGoalTileIdValue ? this.goalTileIdValue : null
    if (goalId === null) return false
    return this.tileAt(row, col) === goalId
  }

  findSpawnY(worldX) {
    if (!this.tileWidth || !this.tileHeight) return null
    if (!this.grid) return null

    const footInset = 6
    const colLeft = Math.floor((worldX + footInset) / this.tileWidth)
    const colRight = Math.floor((worldX + this.frameWidth - footInset) / this.tileWidth)

    for (let row = this.grid.length - 1; row >= 0; row--) {
      if (this.isSolid(row, colLeft) || this.isSolid(row, colRight)) {
        return row * this.tileHeight - this.frameHeight
      }
    }

    return null
  }

  resolveGroundCollision() {
    if (!this.tileWidth || !this.tileHeight) return
    if (!this.grid) return

    if (this.vy < 0) {
      this.onGround = false
      return
    }

    const feetY = this.worldY + this.frameHeight

    const footInset = 6
    const footLeftX = this.worldX + footInset
    const footRightX = this.worldX + this.frameWidth - footInset

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileHeight)

    const supported = this.isSolid(rowUnder, leftCol) || this.isSolid(rowUnder, rightCol)
    if (!supported) {
      this.onGround = false
      return
    }

    this.worldY = rowUnder * this.tileHeight - this.frameHeight
    this.vy = 0
    this.onGround = true
  }

  loseLifeAndRestart() {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = this.maxLives
    }
    this.health = this.maxHealth
    this.updateHealthBar()
    this.respawn()
  }

  checkGoalReached() {
    if (!this.tileWidth || !this.tileHeight) return
    if (!this.grid) return

    const footInset = 6
    const footLeftX = this.worldX + footInset
    const footRightX = this.worldX + this.frameWidth - footInset
    const feetY = this.worldY + this.frameHeight

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileHeight)

    if (this.isGoal(rowUnder, leftCol) || this.isGoal(rowUnder, rightCol)) {
      this.levelEnded = true
      this.levelEndedTime = 0
    }
  }

  respawn() {
    this.cameraX = 0
    this.cameraY = 0
    this.worldX = 50
    this.levelEnded = false
    this.levelEndedTime = 0

    const spawnY = this.findSpawnY(this.worldX)
    if (spawnY != null) {
      this.worldY = spawnY
      this.onGround = true
    } else {
      this.worldY = this.canvas.height - this.frameHeight - 10
      this.onGround = false
    }

    this.vy = 0
    this.updateCamera()
    this.y = this.worldY - this.cameraY
    this.updateHealthBar()
  }

  updateCamera() {
    const levelWidthPx = this.getLevelWidthPx()
    const levelHeightPx = this.mapHeightPx || (this.grid ? this.grid.length * this.tileHeight : this.canvas.height)

    // Horizontal camera
    if (levelWidthPx != null) {
      const maxCameraX = Math.max(0, levelWidthPx - this.canvas.width)
      const centerX = this.canvas.width / 2

      const desiredCameraX = this.worldX - centerX
      if (desiredCameraX > this.cameraX) {
        this.cameraX = Math.min(desiredCameraX, maxCameraX)
      } else if (desiredCameraX < this.cameraX) {
        this.cameraX = Math.max(desiredCameraX, 0)
      }

      this.x = this.worldX - this.cameraX
      if (this.x < 0) this.x = 0
      if (this.x > this.canvas.width - this.frameWidth) {
        this.x = this.canvas.width - this.frameWidth
      }
    } else {
      this.x = this.worldX
    }

    // Vertical camera
    const maxCameraY = Math.max(0, levelHeightPx - this.canvas.height)
    const centerY = this.canvas.height / 2

    const desiredCameraY = this.worldY - centerY
    if (desiredCameraY > this.cameraY) {
      this.cameraY = Math.min(desiredCameraY, maxCameraY)
    } else if (desiredCameraY < this.cameraY) {
      this.cameraY = Math.max(desiredCameraY, 0)
    }

    this.y = this.worldY - this.cameraY
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.background.complete) {
      this.drawBottomAlignedCover(this.background)
    }

    // Draw props behind everything else
    this.drawProps()

    if (this.tileWidth && this.tileHeight) {
      if (this.grid) {
        const rows = this.grid.length
        const cols = rows > 0 ? this.grid[0].length : 0

        const startCol = Math.max(0, Math.floor(this.cameraX / this.tileWidth))
        const endCol = Math.min(cols, startCol + Math.ceil(this.canvas.width / this.tileWidth) + 2)
        const startRow = Math.max(0, Math.floor(this.cameraY / this.tileHeight))
        const endRow = Math.min(rows, startRow + Math.ceil(this.canvas.height / this.tileHeight) + 2)

        for (let row = startRow; row < endRow; row++) {
          for (let col = startCol; col < endCol; col++) {
            const cell = this.grid[row][col]
            if (cell > 0 && this.tileImages[cell]) {
              this.ctx.drawImage(
                this.tileImages[cell],
                col * this.tileWidth - this.cameraX,
                row * this.tileHeight - this.cameraY,
                this.tileWidth,
                this.tileHeight,
              )
            }
          }
        }
      }
    }

    // Atualizar animação e posição do elemento img do sprite
    this.updateSpriteAnimation()
    
    if (this.spriteEl) {
      const canvasRect = this.canvas.getBoundingClientRect()
      const parentRect = this.canvas.parentNode.getBoundingClientRect()
      const offsetX = canvasRect.left - parentRect.left
      const offsetY = canvasRect.top - parentRect.top
      
      this.spriteEl.style.left = `${offsetX + this.x}px`
      this.spriteEl.style.top = `${offsetY + this.y}px`
      this.spriteEl.style.transform = this.direction === "left" ? "scaleX(-1)" : "scaleX(1)"
    }

    this.drawEnemies()
    this.updateHealthBar()

    if (this.levelEnded) {
      this.drawLevelEndedOverlay()
    }
  }

  drawLevelEndedOverlay() {
    const progress = Math.min(this.levelEndedTime / 500, 1)
    const alpha = progress * 0.7

    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (progress >= 0.3) {
      const textProgress = Math.min((this.levelEndedTime - 150) / 300, 1)
      const scale = 0.5 + textProgress * 0.5
      const textAlpha = textProgress

      this.ctx.save()
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
      this.ctx.scale(scale, scale)

      this.ctx.font = "bold 48px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"

      this.ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`
      this.ctx.fillText("LEVEL ENDED", 0, 0)

      this.ctx.strokeStyle = `rgba(139, 69, 19, ${textAlpha})`
      this.ctx.lineWidth = 3
      this.ctx.strokeText("LEVEL ENDED", 0, 0)

      this.ctx.restore()
    }
  }

  drawBottomAlignedCover(img) {
    const cw = this.canvas.width
    const ch = this.canvas.height
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height

    if (!iw || !ih) return

    const scale = Math.max(cw / iw, ch / ih)
    const sw = cw / scale
    const sh = ch / scale

    const sx = (iw - sw) / 2
    const sy = ih - sh

    this.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  }

  drawProps() {
    if (!this.props || this.props.length === 0) return

    this.props.forEach((prop) => {
      const img = this.propImages[prop.id]
      if (!img || !img.complete) return

      const drawX = prop.x - this.cameraX
      const drawY = prop.y - this.cameraY

      // Only draw if prop is visible on screen
      const propWidth = img.naturalWidth || img.width || 64
      const propHeight = img.naturalHeight || img.height || 64

      if (drawX + propWidth < 0 || drawX > this.canvas.width) return
      if (drawY + propHeight < 0 || drawY > this.canvas.height) return

      this.ctx.drawImage(img, drawX, drawY)
    })
  }
}
