// Source 2 networks positions as a cell index plus an offset. Cells are 512 units wide
// and centred on cell 32; the offset spans two cells (0..1024), as in CS2.
export const CELL_SIZE = 512;
export const CELL_ORIGIN = 32;

export const cellToWorld = (cell, offset) => (cell - CELL_ORIGIN) * CELL_SIZE + offset;

// Entity handles pack a serial number above a 14-bit entity index.
export const handleToIndex = (handle) => handle & 0x3fff;
