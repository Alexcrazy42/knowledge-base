export enum EVENT_EMITTERS {
    EXAMPLE = 'EXAMPLE',
}

export type EVENT_EMITTERS_CALLBACKS_PARAMS = {
    [EVENT_EMITTERS.EXAMPLE]: (param1: string, param2: number, param3?: any) => void;
};
