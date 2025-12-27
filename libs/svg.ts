const SVG_NS = "http://www.w3.org/2000/svg";

export class Svg<T extends SVGElement = SVGElement> {
    public elm: T;

    constructor(tag: string) {
        this.elm = document.createElementNS(SVG_NS, tag) as T;
    }

    static el<K extends keyof SVGElementTagNameMap>(tag: K) {
        return new Svg<SVGElementTagNameMap[K]>(tag);
    }

    static svg() {
        return Svg.el("svg");
    }

    append(child: Svg | HTMLElement | string) {
        if (typeof child === "string") {
            this.elm.appendChild(document.createTextNode(child));
        } else {
            this.elm.appendChild(child instanceof Svg ? child.elm : child);
        }
        return this;
    }

    appendMany(children: (Svg | HTMLElement | string)[]) {
        children.forEach((c) => this.append(c));
        return this;
    }

    attr(name: string, value: string) {
        this.elm.setAttribute(name, value);
        return this;
    }

    appendTo(parent: HTMLElement) {
        parent.appendChild(this.elm);
        return this;
    }
}
