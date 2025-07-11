/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/starfield-js
 * License: MIT, see file 'LICENSE'
 */
import { SpaceShip } from "./SpaceShip.js"

export class Starfield {
    constructor(canvas, props) {
        this.canvas = canvas
        this.props = {
            starCount: 400,
            speed: 5,
            fpsMax: 50,
            color: "multi", // set "multi" or a fixed color, like "#ff9"
            magnification: 4,
            showSpaceShip: true, // enable/disable spaceship
            spaceShipCount: 3, // number of spaceships in the swarm
            spaceShipProps: {}, // custom properties for the spaceship
            ...props
        }
        this.ctx = canvas.getContext("2d")
        this.init()
        this.draw()
        window.addEventListener("resize", () => {
            clearTimeout(this.initDebounce)
            this.initDebounce = setTimeout(() => {
                this.init()
            }, 100)
        })

    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i]
            const x = this.centerX + (star.x / star.z) * this.canvas.width
            const y = this.centerY + (star.y / star.z) * this.canvas.height
            const size = this.props.magnification * (1 - star.z / this.canvas.width)
            this.ctx.beginPath()
            this.ctx.arc(x, y, size, 0, Math.PI * 2, false)
            this.ctx.fill()
            this.ctx.fillStyle = star.color
            star.z -= this.props.speed * 60 / this.props.fpsMax
            if (star.z <= 0) {
                star.z = this.canvas.width
                star.x = Math.random() * this.canvas.width - this.centerX
                star.y = Math.random() * this.canvas.height - this.centerY
            }
        }

        // Draw spaceships if they exist
        if (this.spaceShips && this.spaceShips.length > 0) {
            for (const spaceShip of this.spaceShips) {
                spaceShip.draw()
            }
        }

        setTimeout(() => {
            requestAnimationFrame(this.draw.bind(this))
        }, 1000 / this.props.fpsMax)
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

        // Initialize spaceships if enabled
        if (this.props.showSpaceShip) {
            this.spaceShips = []
            for (let i = 0; i < this.props.spaceShipCount; i++) {
                // Create a copy of the props for each ship and add the index
                const shipProps = {
                    ...this.props.spaceShipProps,
                    index: i,
                    swarmCount: this.props.spaceShipCount
                }
                this.spaceShips.push(new SpaceShip(this.canvas, shipProps))
            }

            // After all ships are created, pass the swarm to each ship
            for (const ship of this.spaceShips) {
                ship.setSwarm(this.spaceShips)
            }
        }
    }
}
