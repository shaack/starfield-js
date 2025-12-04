/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/starfield-js
 * License: MIT, see file 'LICENSE'
 */
export class Starfield {
    constructor(canvas, props) {
        this.canvas = canvas
        this.props = {
            starCount: 1000,
            speed: 5,
            color: "multi", // set "multi" or a fixed color, like "#ff9"
            magnification: 4,
            ...props
        }
        this.ctx = canvas.getContext("2d")
        this.lastTime = 0
        this.draw = this.draw.bind(this)
        this.init()
        requestAnimationFrame(this.draw)
        window.addEventListener("resize", () => {
            clearTimeout(this.initDebounce)
            this.initDebounce = setTimeout(() => {
                this.init()
            }, 100)
        })
    }
    draw(currentTime) {
        const deltaTime = Math.min(this.lastTime ? (currentTime - this.lastTime) / 1000 : 0, 0.1)
        this.lastTime = currentTime

        const ctx = this.ctx
        const stars = this.stars
        const centerX = this.centerX
        const centerY = this.centerY
        const width = this.canvas.width
        const height = this.canvas.height
        const magnification = this.props.magnification
        const speed = this.props.speed * 60 * deltaTime

        ctx.clearRect(0, 0, width, height)

        for (let i = 0, len = stars.length; i < len; i++) {
            const star = stars[i]
            const x = centerX + (star.x / star.z) * width
            const y = centerY + (star.y / star.z) * height
            const size = magnification * (1 - star.z / width)
            const drawSize = size * 2

            ctx.drawImage(star.sprite, x - size, y - size, drawSize, drawSize)

            star.z -= speed
            if (star.z <= 0) {
                star.z = width
                star.x = Math.random() * width - centerX
                star.y = Math.random() * height - centerY
            }
        }

        requestAnimationFrame(this.draw)
    }
    createStarSprite(color, size) {
        const sprite = document.createElement('canvas')
        sprite.width = sprite.height = size * 2
        const ctx = sprite.getContext('2d')
        ctx.beginPath()
        ctx.arc(size, size, size, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        return sprite
    }
    init() {
        this.stars = []
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.centerX = this.canvas.width / 2
        this.centerY = this.canvas.height / 2
        const spriteSize = this.props.magnification * 2
        const isMultiColor = this.props.color === "multi"

        // For fixed color, create one shared sprite
        if (!isMultiColor) {
            this.sharedSprite = this.createStarSprite(this.props.color, spriteSize)
        }

        for (let i = 0; i < this.props.starCount; i++) {
            const color = isMultiColor
                ? `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`
                : this.props.color
            const star = {
                x: Math.random() * this.canvas.width - this.centerX,
                y: Math.random() * this.canvas.height - this.centerY,
                z: Math.random() * this.canvas.width,
                sprite: isMultiColor ? this.createStarSprite(color, spriteSize) : this.sharedSprite
            }
            this.stars.push(star)
        }
    }
}
