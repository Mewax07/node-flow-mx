import { HtmlCanvas } from "../.";
import { TextAlign } from "../elements/text";
import { TextStyle, TextStyleConfig } from "../styles/text";
import { Theme } from "../theme";
import { Box } from "../utils/box";
import { Cfg } from "../utils/config";
import { List } from "../utils/list";
import { Vector2 } from "../utils/vector";

const contextEntryHeight = 30;

export function combineContextMenus(...contextMenus: Array<ContextMenuConfig | undefined>): ContextMenuConfig {
    const finalConfig: ContextMenuConfig = {
        items: new Array(),
        subMenus: new Array(),
    };

    for (let config of contextMenus) {
        if (!config) {
            continue;
        }

        if (config.items) {
            finalConfig.items = finalConfig.items?.concat(config.items);
        }

        if (config.subMenus) {
            finalConfig.subMenus = finalConfig.subMenus?.concat(config.subMenus);
        }
    }

    return finalConfig;
}

export type ContextMenuConfig = Partial<{
    name: string;
    textStyle: TextStyleConfig;
    group: string;

    subMenus: Array<ContextMenuConfig>;
    items: Array<ContextMenuItemConfig>;
}>;

export type ContextMenuItemConfig = Partial<{
    name: string;
    textStyle: TextStyleConfig;
    group: string;

    callback: () => void;
}>;

export class ContextMenuItem {
    private name: string;
    private callback?: () => void;
    // @ts-ignore unused temporary
    private textStyle: TextStyle;
    public group?: string;

    constructor(config?: ContextMenuItemConfig) {
        this.name = config?.name ? config.name : "item";
        this.callback = config?.callback;
        this.textStyle = new TextStyle(config?.textStyle);
        this.group = config?.group;
    }

    getName() {
        return this.name;
    }

    execute() {
        if (!this.callback) {
            return;
        }
        this.callback();
    }
}

class ContextGroup {
    private calculatedHeight: number;

    constructor(public entries: Array<ContextEntry>) {
        this.calculatedHeight = entries.length * contextEntryHeight;
    }

    height() {
        return this.calculatedHeight;
    }
}

export class ContextEntry {
    constructor(
        public text: string,
        public subMenu: ContextMenu | undefined,
        public item: ContextMenuItem | undefined,
    ) {}

    click() {
        this.item?.execute();
    }
}

export class ContextMenu {
    private name: string;
    private items: Array<ContextMenuItem>;
    private subMenus: Array<ContextMenu>;
    private textStyle: TextStyle;
    private groups: List<ContextGroup>;
    private group?: string;
    private submenuPos: Vector2;

    private calculatedWidth: number = 0;
    private tempBox: Box = new Box();
    private openSubMenu: ContextMenu | undefined;

    constructor(config?: ContextMenuConfig) {
        this.submenuPos = new Vector2();
        this.groups = new List();
        this.name = Cfg.value(config?.name, "menu");
        this.items = new Array();
        this.subMenus = new Array();
        this.textStyle = new TextStyle(
            TextStyle.textStyleFallback(config?.textStyle, {
                color: Theme.ContextMenu.FontColor,
            }),
        );
        this.group = config?.group;

        if (config?.subMenus !== undefined) {
            for (let i = 0; i < config?.subMenus.length; i++) {
                this.subMenus.push(new ContextMenu(config?.subMenus[i]));
            }
        }

        if (config?.items !== undefined) {
            for (let i = 0; i < config?.items.length; i++) {
                this.items.push(new ContextMenuItem(config?.items[i]));
            }
        }

        this.calculateEntries();
    }

    calculateEntries(): void {
        const groupLUT = new Map<string, number>();
        const workingGroups = new Array<Array<ContextEntry>>();

        workingGroups.push(new Array<ContextEntry>());

        for (let i = 0; i < this.items.length; i++) {
            let group = 0;

            const sub = this.items[i];
            if (sub.group !== undefined) {
                const groupIndex = groupLUT.get(sub.group);
                if (groupIndex !== undefined) {
                    group = groupIndex;
                } else {
                    group = workingGroups.length;
                    groupLUT.set(sub.group, group);
                    workingGroups.push(new Array<ContextEntry>());
                }
            }

            workingGroups[group].push(new ContextEntry(this.items[i].getName(), undefined, this.items[i]));
        }

        for (let i = 0; i < this.subMenus.length; i++) {
            let group = 0;

            const sub = this.subMenus[i];
            if (sub.group !== undefined) {
                const groupIndex = groupLUT.get(sub.group);
                if (groupIndex !== undefined) {
                    group = groupIndex;
                } else {
                    group = workingGroups.length;
                    groupLUT.set(sub.group, group);
                    workingGroups.push(new Array<ContextEntry>());
                }
            }

            workingGroups[group].push(new ContextEntry(this.subMenus[i].getName(), this.subMenus[i], undefined));
        }

        this.groups.clear();
        for (let i = 0; i < workingGroups.length; i++) {
            const groupContent = workingGroups[i];
            if (groupContent.length === 0) {
                continue;
            }
            this.groups.push(new ContextGroup(groupContent));
        }
    }

    getMaxWidthForText(canvas: HtmlCanvas, scale: number): number {
        if (this.calculatedWidth > 0) {
            return this.calculatedWidth;
        }

        const tempVec = new Vector2();
        for (let groupIndex = 0; groupIndex < this.groups.count(); groupIndex++) {
            const group = this.groups.at(groupIndex);
            for (let entryIndex = 0; entryIndex < group.entries.length; entryIndex++) {
                this.textStyle.measure(canvas, scale, group.entries[entryIndex].text, tempVec);
                this.calculatedWidth = Math.max(tempVec.x, this.calculatedWidth);
            }
        }
        return this.calculatedWidth;
    }

    getName(): string {
        return this.name;
    }

    public render(canvas: HtmlCanvas, pppp: Vector2, _scale: number, mousePos: Vector2 | undefined, openRight: boolean): ContextEntry | null {
        const menuScale = 1.25;
        const scaledEntryHeight = menuScale * contextEntryHeight;
        const scaledEntryWidth = menuScale * 40 + this.getMaxWidthForText(canvas, menuScale);

        let totalScaledHeight = 0;
        for (let i = 0; i < this.groups.count(); i++) {
            totalScaledHeight += this.groups.at(i).height();
        }
        totalScaledHeight *= menuScale;

        const pos = new Vector2().copy(pppp);

        if (!openRight) {
            pos.x -= scaledEntryWidth;
        }

        if (pos.y + totalScaledHeight > canvas.elm.clientHeight) {
            pos.y = canvas.elm.clientWidth - totalScaledHeight;
        }

        let submenuOpenRight = openRight;
        if (openRight && pos.x + scaledEntryWidth > canvas.elm.clientWidth) {
            pos.x = canvas.elm.clientWidth - scaledEntryWidth;
            submenuOpenRight = !submenuOpenRight;
        }

        this.tempBox.size.x = scaledEntryWidth;
        this.tempBox.size.y = scaledEntryHeight;
        this.tempBox.pos.copy(pos);

        canvas.ctx.textAlign = TextAlign.Left;
        canvas
            .fillStyle(Theme.ContextMenu.BackgroundColor)
            .shadowColor("#000000dd")
            .shadowBlur(5 * menuScale)
            .roundedRect(pos.x, this.tempBox.pos.y, scaledEntryWidth, totalScaledHeight, 5 * menuScale)
            .shadowBlur(0);

        let mouseIsOver: ContextEntry | null = null;

        let optionsRendered = 0;
        for (let groupIndex = 0; groupIndex < this.groups.count(); groupIndex++) {
            const group = this.groups.at(groupIndex);
            for (let entryIndex = 0; entryIndex < group.entries.length; entryIndex++) {
                const entry = group.entries[entryIndex];

                this.tempBox.pos.y = pos.y + scaledEntryHeight * optionsRendered;

                let entryMousedOver = false;
                if (mousePos && this.tempBox.contains(mousePos)) {
                    mouseIsOver = entry;
                    entryMousedOver = true;
                    if (entry.subMenu !== undefined) {
                        this.openSubMenu = entry.subMenu;
                        this.submenuPos.x = pos.x;
                        this.submenuPos.y = this.tempBox.pos.y;
                        if (submenuOpenRight) {
                            this.submenuPos.x += scaledEntryWidth;
                        }
                    } else {
                        this.openSubMenu = undefined;
                    }
                }

                if (entryMousedOver || (this.openSubMenu && entry.subMenu === this.openSubMenu)) {
                    canvas
                        .fillStyle(Theme.ContextMenu.HighlightColor)
                        .roundedRect(
                            pos.x + scaledEntryHeight / 10,
                            this.tempBox.pos.y + scaledEntryHeight / 10,
                            scaledEntryWidth - scaledEntryHeight / 5,
                            scaledEntryHeight - scaledEntryHeight / 5,
                            5 * menuScale,
                        );
                }

                this.textStyle.setupStyle(canvas, menuScale);
                canvas.textDraw(entry.text, pos.x + scaledEntryHeight / 5, this.tempBox.pos.y + scaledEntryHeight / 2);

                if (entry.subMenu) {
                    canvas
                        .begin()
                        .strokeStyle(Theme.ContextMenu.FontColor)
                        .lineWidth(1 * menuScale)
                        .lineTo(pos.x + scaledEntryWidth - scaledEntryHeight / 2.5, this.tempBox.pos.y + scaledEntryHeight / 3)
                        .lineTo(pos.x + scaledEntryWidth - scaledEntryHeight / 4, this.tempBox.pos.y + scaledEntryHeight / 2)
                        .lineTo(pos.x + scaledEntryWidth - scaledEntryHeight / 2.5, this.tempBox.pos.y + scaledEntryHeight - scaledEntryHeight / 3)
                        .stroke();
                }

                optionsRendered++;
            }

            if (groupIndex !== this.groups.count() - 1) {
                const startX = pos.x + scaledEntryHeight / 10;
                const y = this.tempBox.pos.y + scaledEntryHeight;
                canvas
                    .strokeStyle(Theme.ContextMenu.FontColor)
                    .lineWidth(0.5 * menuScale)
                    .begin()
                    .lineTo(startX, y)
                    .lineTo(startX + scaledEntryWidth - scaledEntryHeight / 5, y)
                    .stroke();
            }
        }

        if (this.openSubMenu !== undefined) {
            const mouseOverSub = this.openSubMenu.render(canvas, this.submenuPos, menuScale, mousePos, submenuOpenRight);
            if (mouseOverSub !== null) {
                mouseIsOver = mouseOverSub;
            }
        }

        return mouseIsOver;
    }
}
