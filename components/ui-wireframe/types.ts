// Legacy wireframe types (now re-exported from WireframeCanvas.tsx)
export type { WireframeData } from './WireframeCanvas';

export type WireframeElement = {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    style?: React.CSSProperties;
    label?: string;
    content?: string;
    iconName?: string;
    children?: WireframeElement[];
};

// UI Blueprint types (used by ui_generation service)
export type UIScreen = {
    name: string;
    components: string[];
};

export type UIBlueprintResponse = {
    screens: UIScreen[];
    userFlows: string[];
};

export interface UIBlueprintError {
    error: string;
    details?: string;
}
