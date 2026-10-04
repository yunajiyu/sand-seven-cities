import defs from '../data/flags.json';

// 이벤트 플래그 저장소. 정의는 data/flags.json, 값은 메모리에만 보관한다.
const state = new Map(Object.entries(defs).filter(([k]) => !k.startsWith('_')));

export const flags = {
  get: (name) => {
    if (!state.has(name)) console.warn(`[flags] 정의되지 않은 플래그: ${name}`);
    return state.get(name);
  },
  set: (name, value = true) => {
    if (!state.has(name)) console.warn(`[flags] 정의되지 않은 플래그: ${name}`);
    state.set(name, value);
  },
  all: () => Object.fromEntries(state),
};
