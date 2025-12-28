import { Html } from "../mx";
import { Vector2 } from "./utils/vector";

export class MouseObserver {
    private clicked: boolean;
    private lastTouch: Vector2;
    private element: Html;
    private lastMousePosition: Vector2;

    private dragCallback: (delta: Vector2) => void;
    private moveCallback: (position: Vector2) => void;
    private clickStart: (position: Vector2, shiftOrCtrl: boolean) => void;
    private clickStop: () => void;

    constructor(
        element: Html,
        dragCallback: (delta: Vector2) => void,
        moveCallback: (position: Vector2) => void,
        clickStart: (position: Vector2, shiftOrCtrl: boolean) => void,
        clickStop: () => void,
        contextMenu: (position: Vector2) => void,
    ) {
        this.element = element;

        this.dragCallback = dragCallback;
        this.moveCallback = moveCallback;
        this.clickStart = clickStart;
        this.clickStop = clickStop;

        this.clicked = false;
        this.lastTouch = new Vector2();
        this.lastMousePosition = new Vector2();

        element.on("mousedown", this.down.bind(this), false);
        element.on("touchstart", this.touchDown.bind(this), false);

        element.on("mouseup", this.up.bind(this), false);
        element.on("touchend", this.touchUp.bind(this), false);

        element.on("mousemove", this.move.bind(this), false);
        element.on("touchmove", this.moveTouch.bind(this), false);

        element.on("drop", (e) => {
            e.preventDefault();
            console.log(e);

            if (e.dataTransfer?.items) {
                [...e.dataTransfer.items].forEach((item, i) => {
                    if (item.kind === "file") {
                        const file = item.getAsFile();
                        if (file) {
                            // fileDrop(file);
                            console.log(file);
                            console.log(`file[${i}].name = ${file.name}, size: ${file.size}`);
                        }
                    }
                });
            } else if (e.dataTransfer) {
                [...e.dataTransfer.files].forEach((file, i) => {
                    console.log(`file[${i}].name = ${file.name}, size: ${file.size}`);
                });
            }
        });

        element.on("dragover", (ev) => {
            ev.preventDefault();
            this.moveCallback(this.mousePosition(ev));
        });

        element.on(
            "contextmenu",
            (evt) => {
                contextMenu(this.mousePosition(evt));
                evt.preventDefault();
            },
            false,
        );
    }

    private mousePosition(e: MouseEvent | DragEvent): Vector2 {
        let rect = this.element.elm.getBoundingClientRect();
        return new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    }

    private move(e: MouseEvent) {
        const pos = this.mousePosition(e);

        if (this.clicked) {
            const delta = new Vector2();
            delta.sub(pos, this.lastMousePosition);
            this.dragCallback(delta);
        }

        this.moveCallback(pos);
        this.lastMousePosition.copy(pos);
    }

    private moveTouch(e: TouchEvent) {
        const rect = this.element.elm.getBoundingClientRect();
        const pos = new Vector2(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        this.moveCallback(pos);

        if (this.clicked) {
            this.dragCallback(new Vector2(pos.x - this.lastTouch.x, pos.y - this.lastTouch.y));
        }

        this.lastTouch.copy(pos);
    }

    private down(e: MouseEvent) {
        if (e.button !== 0) {
            return;
        }
        this.clicked = true;
        this.clickStart(this.mousePosition(e), e.ctrlKey || e.shiftKey);
    }

    touchDown(e: TouchEvent) {
        this.clicked = true;
        const rect = this.element.elm.getBoundingClientRect();
        this.lastTouch.x = e.touches[0].clientX - rect.left;
        this.lastTouch.y = e.touches[0].clientY - rect.top;
        this.clickStart(this.lastTouch, false);
    }

    up(e: MouseEvent) {
        if (e.button !== 0) {
            return;
        }
        this.clicked = false;
        this.clickStop();
    }

    touchUp(_e: TouchEvent) {
        this.clicked = false;
        this.clickStop();
    }
}
