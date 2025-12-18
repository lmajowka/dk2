import { Controller } from "@hotwired/stimulus"
import InputHandler from "game/input_handler"
import Camera from "game/camera"
import SpriteManager from "game/sprite_manager"
import TileMap from "game/tile_map"
import EnemyManager from "game/enemy_manager"
import HUD from "game/hud"
import PropsRenderer from "game/props_renderer"
import PlayerState from "game/player_state"

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
    this.parent = this.canvas.parentNode

    this.frameWidth = 64
    this.frameHeight = 64
    this.speed = 180
    this.gravity = 1800
    this.jumpVelocity = 700

    this.worldX = 50
    this.worldY = this.canvas.height - this.frameHeight - 10
    this.vy = 0
    this.onGround = false
    this.levelEnded = false
    this.levelEndedTime = 0

    this.background = new Image()
    this.background.src = this.backgroundUrlValue

    this.initModules()

    this.lastTimestamp = 0
    this.rafId = requestAnimationFrame(this.loop.bind(this))
  }

  initModules() {
    // Input
    this.input = new InputHandler()
    this.input.attach()

    // Camera
    this.camera = new Camera(this.canvas.width, this.canvas.height)

    // Sprite
    this.sprite = new SpriteManager(
      this.parent,
      this.spriteUrlValue,
      this.hasPunchUrlValue ? this.punchUrlValue : null,
      this.frameWidth,
      this.frameHeight
    )

    // Tile Map
    const tileUrls = this.hasTileUrlsValue ? this.tileUrlsValue : []
    const goalTileId = this.hasGoalTileIdValue ? this.goalTileIdValue : null
    this.tileMap = new TileMap(this.mapValue, tileUrls, goalTileId)

    // Wait for tiles to load then respawn
    const checkReady = () => {
      if (this.tileMap.ready) {
        this.respawn()
      } else {
        setTimeout(checkReady, 50)
      }
    }
    checkReady()

    // Props
    const props = this.hasPropsValue ? this.propsValue : []
    const propUrls = this.hasPropUrlsValue ? this.propUrlsValue : []
    this.propsRenderer = new PropsRenderer(props, propUrls)

    // Enemies
    const enemyData = this.hasEnemiesValue ? this.enemiesValue : []
    const enemyUrl = this.hasEnemyUrlValue ? this.enemyUrlValue : ""
    this.enemies = new EnemyManager(this.parent, enemyData, enemyUrl, this.tileMap)

    // HUD
    this.hud = new HUD(this.parent)

    // Player State
    this.playerState = new PlayerState({ maxLives: 3, maxHealth: 100 })
    this.syncHUD()
  }

  disconnect() {
    this.input.detach()

    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }

    this.sprite.destroy()
    this.hud.destroy()
    this.enemies.destroy()
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

    const dt = delta / 1000

    // Handle punch
    if (this.input.consumePunch() && !this.sprite.punching && this.hasPunchUrlValue) {
      this.sprite.startPunch()
    }
    this.sprite.updatePunch(delta, this.input.walking)

    // Handle jump
    if (this.input.consumeJump() && this.onGround) {
      this.vy = -this.jumpVelocity
      this.onGround = false
    }

    // Horizontal movement
    if (this.input.keys.left) {
      this.worldX -= this.speed * dt
    }
    if (this.input.keys.right) {
      this.worldX += this.speed * dt
    }

    // Clamp world position
    const levelWidthPx = this.tileMap.widthPx
    if (levelWidthPx != null) {
      const maxWorldX = Math.max(0, levelWidthPx - this.frameWidth)
      this.worldX = Math.max(0, Math.min(this.worldX, maxWorldX))
    } else {
      if (this.worldX < 0) this.worldX = 0
    }

    // Gravity
    this.vy += this.gravity * dt
    this.worldY += this.vy * dt

    // Ground collision
    const collision = this.tileMap.resolveGroundCollision(
      this.worldX,
      this.worldY,
      this.vy,
      this.frameWidth,
      this.frameHeight
    )
    this.worldY = collision.worldY
    this.vy = collision.vy
    this.onGround = collision.onGround

    // Camera
    this.camera.update(
      this.worldX,
      this.worldY,
      this.tileMap.widthPx,
      this.tileMap.heightPx || this.canvas.height
    )

    // Goal check
    if (this.tileMap.checkGoalReached(this.worldX, this.worldY, this.frameWidth, this.frameHeight)) {
      this.levelEnded = true
      this.levelEndedTime = 0
    }

    // Death check
    if (this.worldY > this.tileMap.deathY) {
      this.loseLifeAndRestart()
      return
    }

    // Player immunity
    this.playerState.updateImmunity(delta)

    // Enemies
    this.enemies.update(dt, this.worldX)
    if (this.enemies.checkCollision(this.worldX, this.worldY, this.frameWidth, this.frameHeight)) {
      const died = this.playerState.takeDamage(10)
      if (died) {
        this.loseLifeAndRestart()
        return
      }
      this.syncHUD()
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Background
    if (this.background.complete) {
      this.drawBottomAlignedCover(this.background)
    }

    // Props
    this.propsRenderer.draw(this.ctx, this.camera.x, this.camera.y, this.canvas.width, this.canvas.height)

    // Tiles
    this.tileMap.draw(this.ctx, this.camera.x, this.camera.y, this.canvas.width, this.canvas.height)

    // Calculate canvas offset for DOM elements
    const canvasRect = this.canvas.getBoundingClientRect()
    const parentRect = this.parent.getBoundingClientRect()
    const offsetX = canvasRect.left - parentRect.left
    const offsetY = canvasRect.top - parentRect.top

    // Player sprite
    const screenX = this.camera.getScreenX(this.worldX, this.frameWidth)
    const screenY = this.worldY - this.camera.y
    this.sprite.updateAnimation(this.input.walking)
    this.sprite.updatePosition(screenX, screenY, this.input.direction, offsetX, offsetY)

    // Enemies
    this.enemies.draw(this.camera.x, this.camera.y, offsetX, offsetY)

    // Level ended overlay
    if (this.levelEnded) {
      this.hud.drawLevelEndedOverlay(this.ctx, this.canvas.width, this.canvas.height, this.levelEndedTime)
    }
  }

  respawn() {
    this.camera.reset()
    this.worldX = 50
    this.levelEnded = false
    this.levelEndedTime = 0

    const spawnY = this.tileMap.findSpawnY(this.worldX, this.frameWidth, this.frameHeight)
    if (spawnY != null) {
      this.worldY = spawnY
      this.onGround = true
    } else {
      this.worldY = this.canvas.height - this.frameHeight - 10
      this.onGround = false
    }

    this.vy = 0
    this.camera.update(this.worldX, this.worldY, this.tileMap.widthPx, this.tileMap.heightPx || this.canvas.height)
    this.syncHUD()
  }

  loseLifeAndRestart() {
    this.playerState.loseLife()
    this.syncHUD()
    this.respawn()
  }

  syncHUD() {
    this.hud.setHealth(this.playerState.health, this.playerState.maxHealth)
    this.hud.setLives(this.playerState.lives, this.playerState.maxLives)
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
}
