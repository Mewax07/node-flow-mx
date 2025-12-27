type HtmlTarget = keyof HTMLElementTagNameMap | HTMLElement | Html | undefined;
type QueryTarget = string | number | HTMLElement | Html;

export class Html<T extends HTMLElement = HTMLElement> {
    public readonly elm: T;
    private listeners = new Map<string, EventListener>();

    constructor(target?: HtmlTarget) {
        if (target instanceof Html) {
            this.elm = target.self() as T;
        } else if (target instanceof HTMLElement) {
            this.elm = target as T;
        } else if (
            (typeof target === "string" && target.includes(".")) ||
            (typeof target === "string" && target.includes("#"))
        ) {
            const em = Html.emmet(target);
            this.elm = em.elm as T;
        } else {
            const tag = target ?? "div";
            this.elm = document.createElement(tag) as T;
        }
    }

    // Static / Factory
    static from(target: QueryTarget): Html | null {
        if (target instanceof Html) return target;
        if (
            (typeof target === "string" && target.includes(".")) ||
            (typeof target === "string" && target.includes("#"))
        )
            return Html.emmet(target);
        if (target instanceof HTMLElement) return new Html(target);
        if (typeof target === "number") return null;
        const elm = document.querySelector(target) as HTMLElement;
        return elm ? new Html(elm) : null;
    }

    static get(target: QueryTarget): Html | null {
        return Html.from(target);
    }

    static emmet(input: string): Html {
        const tag = input.match(/^[a-z]+/i)?.[0] ?? "div";
        const elm = new Html(tag as keyof HTMLElementTagNameMap);

        const id = input.match(/#([\w-]+)/)?.[1];
        if (id) elm.id(id);

        const classes = [...input.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
        if (classes.length) elm.classOn(...classes);

        return elm;
    }

    // Query (STATIC)
    static qs(selector: string): Html | null {
        const elm = document.querySelector(selector) as HTMLElement;
        return elm ? new Html(elm) : null;
    }

    static qsa(selector: string): Html[] {
        return Array.from(document.querySelectorAll(selector)).map(
            (elm) => new Html(elm as HTMLElement)
        );
    }

    // Query
    qs(selector: string): Html | null {
        const elm = this.elm.querySelector(selector) as HTMLElement;
        return elm ? new Html(elm) : null;
    }

    qsa(selector: string): Html[] {
        return Array.from(this.elm.querySelectorAll(selector)).map(
            (elm) => new Html(elm as HTMLElement)
        );
    }

    find(target: QueryTarget): Html | null {
        if (typeof target === "number") {
            return this.children()[target] ?? null;
        }
        if (target instanceof HTMLElement) return new Html(target);
        if (target instanceof Html) return target;
        return this.qs(target);
    }

    // Attr / Dataset
    attr(name: string, value?: string | null): this {
        if (value === null) this.elm.removeAttribute(name);
        else if (value !== undefined) this.elm.setAttribute(name, value);
        return this;
    }

    dataset(key: string, value: string): this {
        this.elm.dataset[key] = value;
        return this;
    }

    // Id / Class
    id(id: string): this {
        this.elm.id = id;
        return this;
    }

    class(...classNames: string[]): this {
        classNames.forEach((c) => this.elm.classList.toggle(c));
        return this;
    }

    classOn(...classNames: string[]): this {
        classNames.forEach((c) => this.elm.classList.add(c));
        return this;
    }

    classOff(...classNames: string[]): this {
        classNames.forEach((c) => this.elm.classList.remove(c));
        return this;
    }

    // Content
    text(
        content: string,
        method: "content" | "inner" | "outer" = "content"
    ): this {
        if (method === "inner") {
            this.elm.innerText = content;
        } else if (method === "outer") {
            this.elm.outerText = content;
        } else {
            this.elm.textContent = content;
        }
        return this;
    }

    html(content: string, method: "inner" | "outer" = "inner"): this {
        if (method === "outer") {
            this.elm.outerHTML = content;
        } else {
            this.elm.innerHTML = content;
        }
        return this;
    }

    getText(method: "content" | "inner" | "outer" = "content"): string {
        if (method === "inner") {
            return this.elm.innerText;
        } else if (method === "outer") {
            return this.elm.outerText;
        } else {
            return this.elm.textContent;
        }
    }

    getHtml(method: "inner" | "outer" = "inner"): string {
        return method === "inner" ? this.elm.innerHTML : this.elm.outerHTML;
    }

    // Children & Parent
    children(): Html[] {
        return Array.from(this.elm.children).map(
            (c) => new Html(c as HTMLElement)
        );
    }

    firstChild(): Html | null {
        return this.elm.firstElementChild
            ? new Html(this.elm.firstElementChild as HTMLElement)
            : null;
    }

    lastChild(): Html | null {
        return this.elm.lastElementChild
            ? new Html(this.elm.lastElementChild as HTMLElement)
            : null;
    }

    parent(): Html<HTMLElement> {
        return new Html(this.elm.parentElement!);
    }

    // Insert
    append(child: Html | HTMLElement | string): this {
        if (child instanceof Html) {
            this.elm.appendChild(child.elm);
        } else if (child instanceof HTMLElement) {
            this.elm.appendChild(child);
        } else {
            this.elm.appendChild(document.createTextNode(child));
        }
        return this;
    }

    appendMany(items: (Html | HTMLElement | string)[]): this {
        items.forEach((e) => this.append(e));
        return this;
    }

    prepend(child: Html | HTMLElement | string): this {
        if (child instanceof Html) this.elm.prepend(child.elm);
        else if (child instanceof HTMLElement) this.elm.prepend(child);
        else this.elm.prepend(document.createTextNode(child));

        return this;
    }

    prependMany(items: (Html | HTMLElement | string)[]): this {
        items.forEach((e) => this.prepend(e));
        return this;
    }

    appendTo(target: HTMLElement | Html): this {
        const parent = target instanceof Html ? target.elm : target;
        parent.appendChild(this.elm);
        return this;
    }

    // Events
    on<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: T, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): this {
        this.elm.addEventListener(type, listener as EventListener, options);
        this.listeners.set(type, listener as EventListener);
        return this;
    }

    un(type: string): this {
        const listener = this.listeners.get(type);
        if (listener) {
            this.elm.removeEventListener(type, listener);
            this.listeners.delete(type);
        }
        return this;
    }

    // Style
    style(css: string): this {
        this.elm.style.cssText += css;
        return this;
    }

    styleJs(styles: Partial<CSSStyleDeclaration>): this {
        Object.assign(this.elm.style, styles);
        return this;
    }

    // DOM Ops
    swapRef(target: Html): this {
        const a = this.elm;
        const b = target.elm;
        const aNext = a.nextSibling === b ? a : a.nextSibling;
        b.parentNode?.insertBefore(a, b);
        a.parentNode?.insertBefore(b, aNext);
        return this;
    }

    cleanup(): void {
        this.elm.remove();
    }

    clear(): this {
        this.elm.innerHTML = "";
        return this;
    }

    focus(): this {
        this.elm.focus();
        return this;
    }

    self() {
        return this.elm;
    }

    // Component (STATIC)
    static img(): HtmlImg {
        return new HtmlImg();
    }

    static video(): HtmlVideo {
        return new HtmlVideo();
    }

    static audio(): HtmlAudio {
        return new HtmlAudio();
    }

    static canvas(): HtmlCanvas {
        return new HtmlCanvas();
    }

    static input(): HtmlInput {
        return new HtmlInput();
    }

    // Tauri
    static isTauri(): boolean {
        return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    }

    /*
    static async whenTauri<T>(
        callback: (
            tauri: typeof import("@tauri-apps/api/window")
        ) => Promise<T> | T
    ): Promise<T | null> {
        if (!Html.isTauri()) return null;

        const tauri = await import("@tauri-apps/api/window");
        return callback(tauri);
    }
    */
}

export class HtmlImg extends Html<HTMLImageElement> {
    constructor(target?: HTMLImageElement | string) {
        super(
            (target as HTMLElement) ?? ("img" as keyof HTMLElementTagNameMap)
        );
    }

    src(url: string): this {
        this.elm.src = url;
        return this;
    }

    alt(text: string): this {
        this.elm.alt = text;
        return this;
    }

    loading(value: "lazy" | "eager"): this {
        this.elm.loading = value;
        return this;
    }

    width(value: number): this {
        this.elm.width = value;
        return this;
    }

    height(value: number): this {
        this.elm.height = value;
        return this;
    }
}

export class HtmlVideo extends Html<HTMLVideoElement> {
    constructor(target?: HTMLVideoElement | string) {
        super(
            (target as HTMLElement) ?? ("video" as keyof HTMLElementTagNameMap)
        );
    }

    src(url: string): this {
        this.elm.src = url;
        return this;
    }

    play(): this {
        this.elm.play();
        return this;
    }

    pause(): this {
        this.elm.pause();
        return this;
    }

    volume(value: number): this {
        this.elm.volume = Math.min(1, Math.max(0, value));
        return this;
    }

    getVolume(): number {
        return this.elm.volume;
    }

    muted(value = true): this {
        this.elm.muted = value;
        return this;
    }

    loop(value = true): this {
        this.elm.loop = value;
        return this;
    }

    controls(value = true): this {
        this.elm.controls = value;
        return this;
    }

    currentTime(value: number): this {
        this.elm.currentTime = value;
        return this;
    }

    getCurrentTime(): number {
        return this.elm.currentTime;
    }

    duration(): number {
        return this.elm.duration;
    }

    paused(): boolean {
        return this.elm.paused;
    }
}

export class HtmlAudio extends Html<HTMLAudioElement> {
    constructor(target?: HTMLAudioElement | string) {
        super(
            (target as HTMLElement) ?? ("audio" as keyof HTMLElementTagNameMap)
        );
    }

    src(url: string): this {
        this.elm.src = url;
        return this;
    }

    play(): this {
        this.elm.play();
        return this;
    }

    pause(): this {
        this.elm.pause();
        return this;
    }

    volume(value: number): this {
        this.elm.volume = Math.min(1, Math.max(0, value));
        return this;
    }

    getVolume(): number {
        return this.elm.volume;
    }

    muted(value = true): this {
        this.elm.muted = value;
        return this;
    }

    loop(value = true): this {
        this.elm.loop = value;
        return this;
    }

    controls(value = true): this {
        this.elm.controls = value;
        return this;
    }

    currentTime(value: number): this {
        this.elm.currentTime = value;
        return this;
    }

    getCurrentTime(): number {
        return this.elm.currentTime;
    }

    duration(): number {
        return this.elm.duration;
    }

    paused(): boolean {
        return this.elm.paused;
    }
}

export class HtmlCanvas extends Html<HTMLCanvasElement> {
    public readonly ctx: CanvasRenderingContext2D;

    constructor(target?: HTMLCanvasElement) {
        super(
            (target as HTMLElement) ?? ("canvas" as keyof HTMLElementTagNameMap)
        );

        const ctx = this.elm.getContext("2d");
        if (!ctx) {
            throw new Error("Canvas 2D context not available");
        }

        this.ctx = ctx;
        this.resize(window.innerWidth, window.innerHeight);
    }

    // Size / DPI
    resize(
        width: number,
        height: number,
        dpr = window.devicePixelRatio || 1
    ): this {
        this.elm.width = Math.floor(width * dpr);
        this.elm.height = Math.floor(height * dpr);
        this.elm.style.width = `${width}px`;
        this.elm.style.height = `${height}px`;

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return this;
    }

    // Getter
    getWidth(): number {
        return this.elm.width;
    }

    getHeight(): number {
        return this.elm.height;
    }

    measureText(text: string) {
        return this.ctx.measureText(text);
    }

    // State
    save(): this {
        this.ctx.save();
        return this;
    }

    restore(): this {
        this.ctx.restore();
        return this;
    }

    resetTransform(): this {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        return this;
    }

    // Clear
    override clear(): this {
        this.ctx.clearRect(0, 0, this.elm.width, this.elm.height);
        return this;
    }

    // Style
    begin(): this {
        this.ctx.beginPath();
        return this;
    }

    fillStyle(color: string): this {
        this.ctx.fillStyle = color;
        return this;
    }

    strokeStyle(color: string): this {
        this.ctx.strokeStyle = color;
        return this;
    }

    lineWidth(value: number): this {
        this.ctx.lineWidth = value;
        return this;
    }

    alpha(value: number): this {
        this.ctx.globalAlpha = value;
        return this;
    }

    font(value: string): this {
        this.ctx.font = value;
        return this;
    }

    shadowColor(value: string): this {
        this.ctx.shadowColor = value;
        return this;
    }

    shadowBlur(value: number): this {
        this.ctx.shadowBlur = value;
        return this;
    }

    moveTo(x: number, y: number): this {
        this.ctx.moveTo(x, y);
        return this;
    }

    lineTo(x: number, y: number): this {
        this.ctx.lineTo(x, y);
        return this;
    }

    // Caller
    fill(): this {
        this.ctx.fill();
        return this;
    }

    stroke(): this {
        this.ctx.stroke();
        return this;
    }

    // Draw Helpers
    rect(
        x: number,
        y: number,
        w: number,
        h: number,
        method: "f" | "s" | "f+s" = "f"
    ): this {
        this.ctx.beginPath();
        this.ctx.rect(x, y, w, h);
        if (method === "f+s") {
            this.ctx.fill();
            this.ctx.stroke();
        } else if (method === "s") {
            this.ctx.stroke();
        } else {
            this.ctx.fill();
        }
        return this;
    }

    roundedRect(
        x: number,
        y: number,
        w: number,
        h: number,
        radius: any,
        method: "f" | "s" | "f+s" = "f"
    ): this {
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, radius);
        if (method === "f+s") {
            this.ctx.fill();
            this.ctx.stroke();
        } else if (method === "s") {
            this.ctx.stroke();
        } else {
            this.ctx.fill();
        }
        return this;
    }

    circle(
        x: number,
        y: number,
        r: number,
        method: "f" | "s" | "f+s" = "f"
    ): this {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        if (method === "f+s") {
            this.ctx.fill();
            this.ctx.stroke();
        } else if (method === "s") {
            this.ctx.stroke();
        } else {
            this.ctx.fill();
        }
        return this;
    }

    line(x1: number, y1: number, x2: number, y2: number): this {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        return this;
    }

    bezierCurve(x1: number, y1: number, x2: number, y2: number): this {
        const midX = (x1 + x2) / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
        this.ctx.stroke();
        return this;
    }

    textDraw(
        text: string,
        x: number,
        y: number,
        method: "f" | "s" | "f+s" = "f"
    ): this {
        switch (method) {
            case "f":
                this.ctx.fillText(text, x, y);
                break;
            case "s":
                this.ctx.strokeText(text, x, y);
                break;
            case "f+s":
                this.ctx.fillText(text, x, y);
                this.ctx.strokeText(text, x, y);
                break;
            default:
                console.warn(
                    `Unknown text draw method: "${method}". Defaulting to "fill".`
                );
                this.ctx.fillText(text, x, y);
        }
        return this;
    }

    arc(
        x: number,
        y: number,
        r: number,
        startAngle: number = 0,
        endAngle: number = 0,
        clockwise: boolean = true
    ): this {
        this.ctx.arc(x, y, r, startAngle, endAngle, clockwise);
        return this;
    }

    // Image Data
    getImageData(
        x = 0,
        y = 0,
        w = this.elm.width,
        h = this.elm.height
    ): ImageData {
        return this.ctx.getImageData(x, y, w, h);
    }

    putImageData(data: ImageData, x = 0, y = 0): this {
        this.ctx.putImageData(data, x, y);
        return this;
    }

    // Export
    toDataURL(type?: string, quality?: any): string {
        return this.elm.toDataURL(type, quality);
    }

    toBlob(
        callback: (blob: Blob | null) => void,
        type?: string,
        quality?: any
    ): void {
        this.elm.toBlob(callback, type, quality);
    }

    // Align
    alignText(
        config?: Partial<{
            text: CanvasTextAlign;
            baseline: CanvasTextBaseline;
        }>
    ): this {
        this.ctx.textAlign = config?.text ?? "left";
        this.ctx.textBaseline = config?.baseline ?? "top";
        return this;
    }
}

export class HtmlInput extends Html<HTMLInputElement> {
    constructor(placeholder = "", value = "") {
        super("input");
        this.elm.type = "text";
        this.elm.autocomplete = "off";
        this.elm.spellcheck = false;
        this.elm.autofocus = true;
        this.elm.value = value;
        this.elm.placeholder = placeholder;
        this.class("prompt-input");
    }

    getValue(): string {
        return this.elm.value;
    }

    setValue(val: string): this {
        this.elm.value = val;
        return this;
    }

    override focus(): this {
        super.focus();
        return this;
    }

    onEnter(callback: (value: string, e: KeyboardEvent) => void): this {
        this.on("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                callback(this.getValue(), e);
            }
        });
        return this;
    }

    override clear(): this {
        this.elm.value = "";
        return this;
    }
}
