export class GraphClock {
  private _lastTime = 0;

  expectedDelta = 1000 / 60;
  deltaRatio = 0;
  delta = 0;
  totalTime = 0;

  update() {
    if (this._lastTime === 0) {
      this._lastTime = performance.now();
      return;
    }
    const current = performance.now();
    this.delta = current - this._lastTime;
    this.totalTime += this.delta;
    this.deltaRatio = this.delta / this.expectedDelta;
    this._lastTime = current;
  }
}
