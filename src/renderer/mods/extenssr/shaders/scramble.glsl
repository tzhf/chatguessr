vec3 scrambleFunc()
{
    const int NUM_ROWS = 4;
    const int NUM_COLS = 4;

    int x = int(vTexCoord.x * float(NUM_COLS));
    int y = int(vTexCoord.y * float(NUM_ROWS));

    float dx = mod(vTexCoord.x, 1.0 / float(NUM_COLS));
    float dy = mod(vTexCoord.y, 1.0 / float(NUM_ROWS));
    int oldIdx = y * NUM_COLS + x;
    int newIdx = 0;
    if (oldIdx == 0) newIdx = scrambled[0];
    if (oldIdx == 1) newIdx = scrambled[1];
    if (oldIdx == 2) newIdx = scrambled[2];
    if (oldIdx == 3) newIdx = scrambled[3];
    if (oldIdx == 4) newIdx = scrambled[4];
    if (oldIdx == 5) newIdx = scrambled[5];
    if (oldIdx == 6) newIdx = scrambled[6];
    if (oldIdx == 7) newIdx = scrambled[7];
    if (oldIdx == 8) newIdx = scrambled[8];
    if (oldIdx == 9) newIdx = scrambled[9];
    if (oldIdx == 10) newIdx = scrambled[10];
    if (oldIdx == 11) newIdx = scrambled[11];
    if (oldIdx == 12) newIdx = scrambled[12];
    if (oldIdx == 13) newIdx = scrambled[13];
    if (oldIdx == 14) newIdx = scrambled[14];
    if (oldIdx == 15) newIdx = scrambled[15];

    y = newIdx / NUM_COLS;
    x = newIdx - (NUM_COLS * y);
    float u = (float(x) / float(NUM_COLS)) + dx;
    float v = (float(y) / float(NUM_ROWS)) + dy;
    return texture2D(texture, vec2(u, v)).rgb;
}