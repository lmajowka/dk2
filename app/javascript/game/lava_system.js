export default class LavaSystem {
  constructor(canvas, parent) {
    this.canvas = canvas
    this.parent = parent
    this.drops = []
    this.active = false
    this.duration = 3000
    this.elapsed = 0
    this.spawnInterval = 150
    this.lastSpawn = 0
    this.container = this.createContainer()
  }

  createContainer() {
    const container = document.createElement("div")
    container.style.position = "fixed"
    container.style.top = "0"
    container.style.left = "0"
    container.style.width = "100%"
    container.style.height = "100%"
    container.style.pointerEvents = "none"
    container.style.zIndex = "1000"
    container.style.overflow = "hidden"
    document.body.appendChild(container)
    return container
  }

  start() {
    this.active = true
    this.elapsed = 0
    this.lastSpawn = 0
  }

  update(dt, enemies, cameraX, cameraY) {
    if (!this.active && this.drops.length === 0) return

    const deltaMs = dt * 1000
    this.elapsed += deltaMs

    if (this.active && this.elapsed < this.duration) {
      this.lastSpawn += deltaMs
      if (this.lastSpawn >= this.spawnInterval) {
        this.spawnDrop()
        this.lastSpawn = 0
      }
    } else if (this.elapsed >= this.duration) {
      this.active = false
    }

    this.updateDrops(dt, enemies, cameraX, cameraY)
  }

  spawnDrop() {
    const direction = Math.random() < 0.5 ? "left" : "right"
    const canvasRect = this.canvas.getBoundingClientRect()
    
    const startX = canvasRect.left + canvasRect.width / 2
    const startY = canvasRect.top - 50

    const el = document.createElement("div")
    el.className = "lava-drop"
    const size = 14 + Math.random() * 10
    el.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, 
        #ffffc8 0%, 
        #ffc832 30%, 
        #ff7800 60%, 
        #c83200 100%);
      box-shadow: 0 0 ${size}px #ff7800, 0 0 ${size * 2}px #ff5000;
      pointer-events: none;
      left: ${startX}px;
      top: ${startY}px;
    `
    this.container.appendChild(el)

    this.drops.push({
      el,
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      phase: "slide",
      direction,
      size,
    })
  }

  updateDrops(dt, enemies, cameraX, cameraY) {
    const canvasRect = this.canvas.getBoundingClientRect()
    const browserHeight = window.innerHeight

    const borderLeft = canvasRect.left
    const borderRight = canvasRect.right
    const borderTop = canvasRect.top

    this.drops = this.drops.filter((drop) => {
      if (drop.phase === "slide") {
        drop.vy = 400
        drop.y += drop.vy * dt

        if (drop.y >= borderTop) {
          drop.y = borderTop
          drop.phase = "horizontal"
          drop.vx = drop.direction === "left" ? -500 : 500
          drop.vy = 0
        }
      } else if (drop.phase === "horizontal") {
        drop.x += drop.vx * dt

        const reachedEdge =
          (drop.direction === "left" && drop.x <= borderLeft) ||
          (drop.direction === "right" && drop.x >= borderRight)

        if (reachedEdge) {
          drop.x = drop.direction === "left" ? borderLeft : borderRight
          drop.phase = "fall"
          drop.vx = 0
          drop.vy = 0
        }
      } else if (drop.phase === "fall") {
        drop.vy += 1500 * dt
        drop.y += drop.vy * dt

        this.checkEnemyCollision(drop, enemies, cameraX, cameraY, canvasRect)
      }

      drop.el.style.left = `${drop.x - drop.size / 2}px`
      drop.el.style.top = `${drop.y - drop.size / 2}px`

      if (drop.y > browserHeight + 50) {
        drop.el.remove()
        return false
      }
      return true
    })
  }

  checkEnemyCollision(drop, enemies, cameraX, cameraY, canvasRect) {
    if (!enemies || !enemies.sprites) return

    const dropScreenX = drop.x - canvasRect.left
    const dropScreenY = drop.y - canvasRect.top
    const dropWorldX = dropScreenX + cameraX
    const dropWorldY = dropScreenY + cameraY

    enemies.sprites = enemies.sprites.filter((enemy) => {
      const hit = this.isHit(dropWorldX, dropWorldY, drop.size, enemy, enemies)
      if (hit) {
        this.createDeathEffect(drop)
        if (enemy.el && enemy.el.parentNode) {
          enemy.el.remove()
        }
        return false
      }
      return true
    })
  }

  isHit(dropX, dropY, dropSize, enemy, enemies) {
    const enemyLeft = enemy.worldX
    const enemyRight = enemy.worldX + enemies.enemyWidth
    const enemyTop = enemy.worldY
    const enemyBottom = enemy.worldY + enemies.enemyHeight

    return (
      dropX + dropSize > enemyLeft &&
      dropX - dropSize < enemyRight &&
      dropY + dropSize > enemyTop &&
      dropY - dropSize < enemyBottom
    )
  }

  createDeathEffect(drop) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const size = 8
      const el = document.createElement("div")
      el.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: radial-gradient(circle, #ffff00, #ff5000);
        box-shadow: 0 0 ${size}px #ff7800;
        pointer-events: none;
        left: ${drop.x}px;
        top: ${drop.y}px;
        transition: all 0.3s ease-out;
      `
      this.container.appendChild(el)

      const vx = Math.cos(angle) * 80
      const vy = Math.sin(angle) * 80
      
      requestAnimationFrame(() => {
        el.style.left = `${drop.x + vx}px`
        el.style.top = `${drop.y + vy}px`
        el.style.opacity = "0"
        el.style.transform = "scale(0.2)"
      })

      setTimeout(() => el.remove(), 300)
    }
  }

  draw(ctx) {
    // Lava is now rendered via DOM elements, no canvas drawing needed
  }

  isActive() {
    return this.active || this.drops.length > 0
  }

  destroy() {
    this.drops.forEach((drop) => drop.el.remove())
    this.drops = []
    if (this.container && this.container.parentNode) {
      this.container.remove()
    }
  }
}
