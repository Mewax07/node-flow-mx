import { decodeTheme } from "../theme";

export type CompactTheme = {
    m: string;
    c: string;
    x: string;
};

export const PALETTE_KEYS = [
    "graph.bg",

    "node.bg",
    "node.font",
    "node.title.bg",
    "node.title.font",
    "node.border.idle",
    "node.border.hover",
    "node.border.grab",
    "node.border.selected",
    "node.port.font",
    "node.port.border",

    "msg.info",
    "msg.warn",
    "msg.error",

    "widget.bg",
    "widget.font",
    "widget.border",
    "widget.hover",
    "widget.slider",
    "widget.button",

    "context.bg",
    "context.hl",
    "context.font",

    "minimap.bg",
    "minimap.border",
    "minimap.node.fill",
    "minimap.node.stroke",
    "minimap.note.fill",
    "minimap.note.stroke",
    "minimap.view",
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;

type LegacyTheme = {
    css: Record<string, string>;
    colors: Record<string, string>;
};

export function legacyThemeToPalette(t: LegacyTheme): Palette {
    return {
        "graph.bg": t.css["--_-bg_c"],

        "node.bg": t.css["--_-card-bg"],
        "node.font": t.css["--mocha-text"],
        "node.title.bg": t.css["--mocha-border"],
        "node.title.font": t.css["--mocha-text"],
        "node.border.idle": t.css["--mocha-border"],
        "node.border.hover": t.css["--mocha-border-soft"],
        "node.border.grab": t.css["--mocha-accent-soft"],
        "node.border.selected": t.css["--mocha-accent"],
        "node.port.font": t.css["--mocha-text-muted"],
        "node.port.border": t.css["--mocha-border"],

        "msg.info": t.css["--mocha-text-faint"],
        "msg.warn": t.css["--mocha-warning"],
        "msg.error": t.css["--mocha-error"],

        "widget.bg": t.css["--_-ws_c"],
        "widget.font": t.css["--mocha-text"],
        "widget.border": t.css["--mocha-border"],
        "widget.hover": t.css["--_-bg_c_h"],
        "widget.slider": t.css["--mocha-selection"],
        "widget.button": t.css["--mocha-accent"],

        "context.bg": t.css["--_-ws_c"],
        "context.hl": t.css["--mocha-selection"],
        "context.font": t.css["--mocha-text"],

        "minimap.bg": t.css["--_-bg_c"],
        "minimap.border": t.css["--mocha-border"],
        "minimap.node.fill": t.css["--_-card-bg"],
        "minimap.node.stroke": t.css["--mocha-border-soft"],
        "minimap.note.fill": t.css["--_-bg_c"],
        "minimap.note.stroke": t.css["--mocha-text"],
        "minimap.view": t.css["--mocha-accent-soft"],
    };
}

export function decodePalette(base64: CompactTheme): Palette {
    const theme = decodeTheme(base64);

    return legacyThemeToPalette(theme);
}

export type GraphTheme = {
    FontFamily: string;
    Graph: {
        BackgroundColor: string;
    };
    Node: {
        FontColor: string;
        BackgroundColor: string;
        Title: {
            Color: string;
            FontColor: string;
            Padding: number;
        };
        BorderRadius: number;
        Border: {
            Idle: string;
            MouseOver: string;
            Grabbed: string;
            Selected: string;
        };
        Port: {
            FontColor: string;
            BorderColor: string;
            FallbackValue: number;
            FallbackModulo: number;
        };
        Message: {
            InfoColor: string;
            WarnColor: string;
            ErrorColor: string;
        };
    };
    BoxSelect: {
        Color: string;
        Size: number;
        Radius: number;
        LineDashLength: number;
    };
    Widget: {
        FontColor: string;
        BackgroundColor: string;
        Border: {
            Color: string;
            Size: number;
            Radius: number;
        };
        Hover: {
            BackgroundColor: string;
        };
        Slider: {
            FillColor: string;
        };
        Button: {
            Click: {
                BackgroundColor: string;
            };
        };
    };
    ContextMenu: {
        BackgroundColor: string;
        HighlightColor: string;
        FontColor: string;
    };
    Note: {
        FontColor: string;
        FontSize: number;
        EntrySpacing: number;
        LineSpacing: number;
        DotSize: number;
        HeaderLineWidth: number;
        QuoteIndent: number;
        BlockQuote: {
            BarColor: string;
        };
        H1: {
            FontSize: number;
        };
        H2: {
            FontSize: number;
        };
        H3: {
            FontSize: number;
        };
        H4: {
            FontSize: number;
        };
        H5: {
            FontSize: number;
        };
        H6: {
            FontSize: number;
        };
        CodeBlock: {
            BackgroundColor: string;
            Padding: number;
            BorderRadius: number;
        };
    };
    Minimap: {
        BackgroundColor: string;
        BorderColor: string;
        NodeFill: string;
        NodeStroke: string;
        NoteFill: string;
        NoteStroke: string;
        ViewportStroke: string;
        LineWidth: number;
    };
};

export function buildTheme(p: Palette): GraphTheme {
    return {
        FontFamily: "Courier New",
        Graph: {
            BackgroundColor: p["graph.bg"],
        },
        Node: {
            FontColor: p["node.font"],
            BackgroundColor: p["node.bg"],
            Title: {
                Color: p["node.title.bg"],
                FontColor: p["node.title.font"],
                Padding: 5,
            },
            BorderRadius: 15,
            Border: {
                Idle: p["node.border.idle"],
                MouseOver: p["node.border.hover"],
                Grabbed: p["node.border.grab"],
                Selected: p["node.border.selected"],
            },
            Port: {
                FontColor: p["node.port.font"],
                BorderColor: p["node.port.border"],
                FallbackValue: 0.5,
                FallbackModulo: 0,
            },
            Message: {
                InfoColor: p["msg.info"],
                WarnColor: p["msg.warn"],
                ErrorColor: p["msg.error"],
            },
        },
        BoxSelect: {
            Color: p["widget.slider"],
            Size: 1,
            Radius: 2,
            LineDashLength: 5,
        },
        Widget: {
            FontColor: p["widget.font"],
            BackgroundColor: p["widget.bg"],
            Border: {
                Color: p["widget.border"],
                Size: 2,
                Radius: 2,
            },
            Hover: { BackgroundColor: p["widget.hover"] },
            Slider: { FillColor: p["widget.slider"] },
            Button: { Click: { BackgroundColor: p["widget.button"] } },
        },
        ContextMenu: {
            BackgroundColor: p["context.bg"],
            HighlightColor: p["context.hl"],
            FontColor: p["context.font"],
        },
        Note: {
            FontColor: p["node.font"],
            FontSize: 16,
            EntrySpacing: 20,
            LineSpacing: 5,
            DotSize: 3,
            HeaderLineWidth: 2,
            QuoteIndent: 2,
            BlockQuote: {
                BarColor: p["node.font"],
            },
            H1: {
                FontSize: 32,
            },
            H2: {
                FontSize: 28,
            },
            H3: {
                FontSize: 24,
            },
            H4: {
                FontSize: 20,
            },
            H5: {
                FontSize: 18,
            },
            H6: {
                FontSize: 16,
            },
            CodeBlock: {
                BackgroundColor: p["widget.bg"],
                Padding: 16,
                BorderRadius: 4,
            },
        },
        Minimap: {
            BackgroundColor: p["minimap.bg"],
            BorderColor: p["minimap.border"],
            NodeFill: p["minimap.node.fill"],
            NodeStroke: p["minimap.node.stroke"],
            NoteFill: p["minimap.note.fill"],
            NoteStroke: p["minimap.note.stroke"],
            ViewportStroke: p["minimap.view"],
            LineWidth: 2,
        },
    };
}

const DEFAULT_THEME: Record<string, CompactTheme> = {
    dark: {
        m: "eyJuYW1lIjoiRGFyayIsInZlcnNpb24iOiIxLjAuMCIsImRlc2NyaXB0aW9uIjoiRGVmYXVsdCBEYXJrIFRoZW1lIiwiYXV0aG9ycyI6WyJNZXdheDA3Il19",
        c: "Dg4OJCQkCgoKFRUVDQ0NAAAA5tzPuKqZin9yyJtq3biSqXFC1KNznGZEsIlof1U5f1U5pHFIj7yP5rVmx11KOy8k3biS",
        x: "Dg4Ox11Kj7yP5rVmf1U5qXFC3biS5tzPin9yx11Kj7yP5rVmf1U5yJtq3biS5tzP5tzP",
    },
    light: {
        m: "eyJuYW1lIjoiTGlnaHQiLCJ2ZXJzaW9uIjoiMS4wLjAiLCJkZXNjcmlwdGlvbiI6IkRlZmF1bHQgTGlnaHQgVGhlbWUiLCJhdXRob3JzIjpbIk1ld2F4MDciXX0=",
        c: "7Ozs4ODgz8/PzMzM5+fnAAAAOi8lb15Nm4p4sIlo3biSf1U5nGZEf1U5b043pHFIsIlo3biSj7yP5rVmx11K5tzPf1U5",
        x: "7Ozsx11Kj7yP5rVmb043pHFI3biSOi8l////x11Kj7yP5rVmf1U5sIlo3biSm4p4Oi8l",
    },
};

export type ThemeChangeCallback = (theme: GraphTheme) => void;

export let Theme: GraphTheme;

let currentTheme: GraphTheme | null = null;
const listeners = new Set<ThemeChangeCallback>();

export function onThemeChange(cb: ThemeChangeCallback) {
    listeners.add(cb);
    if (currentTheme) cb(currentTheme);
    return () => listeners.delete(cb);
}

export function getTheme(): GraphTheme {
    if (!currentTheme) {
        throw new Error("Theme not initialized");
    }
    return currentTheme;
}

export function loadTheme(name: string): CompactTheme | null {
    return DEFAULT_THEME[name] ?? null;
}

export function setThemeFromCompact(compact: CompactTheme) {
    const palette = decodePalette(compact);
    const next = buildTheme(palette);

    Theme = next;
    currentTheme = next;

    for (const cb of listeners) cb(next);
}

export function setTheme(name: string) {
    const compact = loadTheme(name);
    if (!compact) {
        console.warn(`Theme "${name}" not found`);
        return;
    }
    setThemeFromCompact(compact);
}

setTheme("dark");

(window as any).theme = setTheme;
(window as any).getTheme = getTheme;
