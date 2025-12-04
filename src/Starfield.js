/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/starfield-js
 * License: MIT, see file 'LICENSE'
 */
export class Starfield {
    constructor(canvas, props) {
        this.canvas = canvas
        this.props = {
            starCount: 2000,
            speed: 5,
            color: "multi", // set "multi" or a fixed color, like "#ff9"
            magnification: 4,
            ...props
        }
        this.ctx = canvas.getContext("2d")
        this.lastTime = performance.now()
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
        const deltaTime = (currentTime - this.lastTime) / 1000
        this.lastTime = currentTime

        const ctx = this.ctx
        const stars = this.stars
        const centerX = this.centerX
        const centerY = this.centerY
        const width = this.canvas.width
        const height = this.canvas.height
        const magnification = this.props.magnification
        const speed = this.props.speed * 60 * deltaTime
        const isMultiColor = this.props.color === "multi"
        const TWO_PI = Math.PI * 2

        ctx.clearRect(0, 0, width, height)

        if (!isMultiColor) {
            ctx.fillStyle = this.props.color
        }

        for (let i = 0, len = stars.length; i < len; i++) {
            const star = stars[i]
            const x = centerX + (star.x / star.z) * width
            const y = centerY + (star.y / star.z) * height
            const size = magnification * (1 - star.z / width)

            if (isMultiColor) {
                ctx.fillStyle = star.color
            }

            ctx.beginPath()
            ctx.arc(x, y, size, 0, TWO_PI)
            ctx.fill()

            star.z -= speed
            if (star.z <= 0) {
                star.z = width
                star.x = Math.random() * width - centerX
                star.y = Math.random() * height - centerY
            }
        }

        requestAnimationFrame(this.draw)
    }
    init() {
        this.stars = []
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.centerX = this.canvas.width / 2
        this.centerY = this.canvas.height / 2
        for (let i = 0; i < this.props.starCount; i++) {
            const star = {
                x: Math.random() * this.canvas.width - this.centerX,
                y: Math.random() * this.canvas.height - this.centerY,
                z: Math.random() * this.canvas.width,
                color: "rgb(255,255,255)"
            }
            if(this.props.color === "multi") {
                star.color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`
            } else {
                star.color = this.props.color
            }

            this.stars.push(star)
        }

    }
}
