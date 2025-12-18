export default class EnemyManager {
  constructor(parent, enemyData, enemyUrl, tileMap) {
    this.parent = parent
    this.tileMap = tileMap
    this.enemyWidth = 96
    this.enemyHeight = 96
    this.enemyOffsetY = 32
    this.sprites = []

    if (!enemyUrl || enemyData.length === 0) return

    enemyData.forEach((enemy) => {
      const el = document.createElement("img")
      el.src = enemyUrl
      el.style.position = "absolute"
      el.style.width = `${this.enemyWidth}px`
      el.style.height = `${this.enemyHeight}px`
      el.style.pointerEvents = "none"
      el.style.imageRendering = "pixelated"
      parent.appendChild(el)

      this.sprites.push({
        el,
        worldX: enemy.x,
        worldY: enemy.y,
        direction: "left",
        speed: 50 + Math.random() * 30,
        vy: 0,
      })
    })
  }

  update(dt, playerWorldX) {
    if (this.sprites.length === 0) return

    this.sprites.forEach((enemy) => {
      const dx = playerWorldX - enemy.worldX
      if (dx > 0) {
        enemy.worldX += enemy.speed * dt
        enemy.direction = "right"
      } else if (dx < 0) {
        enemy.worldX -= enemy.speed * dt
        enemy.direction = "left"
      }

      this.applyGravity(enemy, dt)
    })
  }

  applyGravity(enemy, dt) {
    const gravity = 1800

    enemy.vy += gravity * dt
    enemy.worldY += enemy.vy * dt

    const feetY = enemy.worldY + this.enemyHeight
    const footInset = 6
    const footLeftX = enemy.worldX + footInset
    const footRightX = enemy.worldX + this.enemyWidth - footInset

    const leftCol = Math.floor(footLeftX / this.tileMap.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileMap.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileMap.tileHeight)

    const supported = this.tileMap.isSolid(rowUnder, leftCol) || this.tileMap.isSolid(rowUnder, rightCol)
    if (supported && enemy.vy >= 0) {
      enemy.worldY = rowUnder * this.tileMap.tileHeight - this.enemyHeight
      enemy.vy = 0
    }
  }

  checkCollision(playerWorldX, playerWorldY, playerWidth, playerHeight) {
    for (const enemy of this.sprites) {
      const playerLeft = playerWorldX
      const playerRight = playerWorldX + playerWidth
      const playerTop = playerWorldY
      const playerBottom = playerWorldY + playerHeight

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
        return true
      }
    }
    return false
  }

  draw(cameraX, cameraY, canvasOffsetX, canvasOffsetY) {
    if (this.sprites.length === 0) return

    this.sprites.forEach((enemy) => {
      const screenX = enemy.worldX - cameraX
      const screenY = enemy.worldY - cameraY + this.enemyOffsetY

      enemy.el.style.left = `${canvasOffsetX + screenX}px`
      enemy.el.style.top = `${canvasOffsetY + screenY}px`
      enemy.el.style.transform = enemy.direction === "left" ? "scaleX(-1)" : "scaleX(1)"
    })
  }

  getCount() {
    return this.sprites.length
  }

  destroy() {
    this.sprites.forEach((enemy) => {
      if (enemy.el && enemy.el.parentNode) {
        enemy.el.remove()
      }
    })
    this.sprites = []
  }
}
