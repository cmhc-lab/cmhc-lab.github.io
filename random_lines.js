const canvas = document.getElementById('brainwaves');
canvas.width = window.innerWidth;
//canvas.height = window.innerHeight;

const ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = '#ddd';
//ctx.strokeStyle = 'white';

function drawTraces() {
  traces = [];
  initPositions = [];
  numTraces = canvas.height / 10;
  vspace = canvas.height / numTraces;
  for (let y=vspace/2; y<=canvas.height-vspace/2; y+=vspace) {
    traces.push(y);
    initPositions.push(y);
  }

  for (let i=0; i<traces.length; i++) {
    let x = 0;
    ctx.beginPath();
    ctx.moveTo(x, traces[i]);
    for (; x<canvas.width; x++) {
      traces[i] += 2 * (Math.random() - (traces[i] - initPositions[i]) / (4 * vspace) - 0.5);
      ctx.lineTo(x, traces[i]);
    }
    ctx.stroke();
  }

  function update() {
    if(window.innerWidth < 900) {
      return;
    }

    const offset = 1;

    let x = canvas.width - offset - 1;
    ctx.drawImage(canvas,
      offset, 0, x, canvas.height, // from
      0, 0, x, canvas.height // to
    );

    ctx.fillRect(x, 0, offset, canvas.height);

    for (let i=0; i<traces.length; i++) {
      let x = canvas.width - offset - 1;
      ctx.beginPath();
      ctx.moveTo(x - 1, traces[i]);
      for (; x<canvas.width; x++) {
        traces[i] += 2 * (Math.random() - (traces[i] - initPositions[i]) / (4 * vspace) - 0.5);
        ctx.lineTo(x, traces[i]);
      }
      ctx.stroke();
    }
    window.requestAnimationFrame(update);
  }

  window.requestAnimationFrame(update);
}

drawTraces();
