function blobToArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  })
}

function blobToText(blob) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  })
}

function dbConnect() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vectors', 3);
    request.onsuccess = e => resolve(e.target.result);

    request.onerror = function(e) {
      console.error(`connect error: ${ e.target.errorCode }`);
      reject();
    };

    request.onupgradeneeded = function(e) {
      if(e.oldVersion < 3) {
        vectors = request.result.createObjectStore('glove-en', {keyPath: 'key'});
        vectors = request.result.createObjectStore('word2vec-en', {keyPath: 'key'});
        vectors = request.result.createObjectStore('word2vec-fi', {keyPath: 'key'});
      }
    }
  });
}

var VEC_SIZE = 300;

async function loadVectorData(vectorType) {
  if(vectorType == 'word2vec-fi') {
    VEC_SIZE = 200;
  }
  const VEC_SIZE_BYTES = 4 * VEC_SIZE;

  const db = await dbConnect();

  let dataPresent = await new Promise(resolve => {
    const trans = db.transaction(vectorType, 'readonly');
    let store = trans.objectStore(vectorType);
    store.count().onsuccess = e => resolve(e.target.result);
  })
  if(dataPresent >= 3) {
    console.log('We already have data.');

    let nVectors = 0;
    let vocab = await new Promise(resolve => {
      const trans = db.transaction(vectorType, 'readonly');
      let store = trans.objectStore(vectorType);
      let request = store.get('vocab');
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
    });
    vocab = vocab.text.split('\r\n');

    let vectorsBlob = await new Promise(resolve => {
      const trans = db.transaction(vectorType, 'readonly');
      let store = trans.objectStore(vectorType);
      let request = store.get('vectors');
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
    });
    vectors = new Float32Array(await blobToArrayBuffer(new Blob([vectorsBlob.blob], {type: 'application/octet-stream'})));

    let pcaBlob = await new Promise(resolve => {
      const trans = db.transaction(vectorType, 'readonly');
      let store = trans.objectStore(vectorType);
      let request = store.get('pca');
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
    });
    pca = new Float32Array(await blobToArrayBuffer(new Blob([pcaBlob.blob], {type: 'application/octet-stream'})));

    const dict = {};
    for(let i=0; i<vocab.length; i++) {
      dict[vocab[i]] = {vector: vectors.slice(i * VEC_SIZE, (i + 1) * VEC_SIZE), pca: pca.slice(i * 3, (i + 1) * 3)};
    }
    return dict;
  }

  console.log('Downloading data...');

  let response = undefined;
  if(vectorType == 'glove-en') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1QOZoRDFd3K9mMQ54QwdOWeE72PaO9PYv?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else if(vectorType == 'word2vec-en') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1XnnCAKDD4ePAZVpM9rzgclfFMFVIOTDO?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else if(vectorType == 'word2vec-fi') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1yrjhCpdORG2q_jf5aONFatrykPW2buVX?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else {
    throw 'Unknown vector type: ' + vectorType; 
  }
  const text = await blobToText(await response.blob());
  const vocab = text.split('\r\n');
  const nVectors = vocab.length;

  if(vectorType == 'glove-en') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1kBFKvTQQdbB3uWpkCXiufqjSXJb-PGbp?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else if(vectorType == 'word2vec-en') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1cddc2pjjOwKrOBAWyUbhFJFyitO4ggXU?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else if(vectorType == 'word2vec-fi') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1A-o4Tk-o2s9YHOddEIZyaJAZ3Ss0kV-x?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else {
    throw 'Unknown vector type: ' + vectorType; 
  }
  const reader = response.body.getReader();
  let bytesRead = 0;
  let vectsRead = 0;
  const vectorData = new Uint8Array(nVectors * VEC_SIZE_BYTES);

  while(true) {
    const {done, value} = await reader.read();
    if(done) {
      break;
    }

    vectorData.set(value, bytesRead);
    bytesRead += value.length;
    document.getElementById('loading-w2v').value = (bytesRead) / vectorData.length;
  }

  if(vectorType == 'glove-en') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1jZ7uQr7WGl-BKHMQYcInCeRzZh2bRg5e?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else if(vectorType == 'word2vec-en') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1jZ7uQr7WGl-BKHMQYcInCeRzZh2bRg5e?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else if(vectorType == 'word2vec-fi') {
    response = await fetch('https://www.googleapis.com/drive/v3/files/1jZ7uQr7WGl-BKHMQYcInCeRzZh2bRg5e?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  } else {
    throw 'Unknown vector type: ' + vectorType; 
  }
  const pcaData = await response.blob();

  console.log('Storing vectors in local database')
  await new Promise(resolve => {
    const trans = db.transaction(vectorType, 'readwrite');
    trans.oncomplete = resolve;
    const store = trans.objectStore(vectorType);
    store.put({key: 'vocab', text: text});
  });
  await new Promise(resolve => {
    const trans = db.transaction(vectorType, 'readwrite');
    trans.oncomplete = resolve;
    const store = trans.objectStore(vectorType);
    store.put({key: 'vectors', blob: vectorData});
  });
  await new Promise(resolve => {
    const trans = db.transaction(vectorType, 'readwrite');
    trans.oncomplete = resolve;
    const store = trans.objectStore(vectorType);
    store.put({key: 'pca', blob: pcaData});
  });

  const dict = {};
  vectors = new Float32Array(await blobToArrayBuffer(new Blob([vectorData.buffer], {type: 'application/octet-stream'})));
  pca = new Float32Array(await blobToArrayBuffer(pcaData, {type: 'application/octet-stream'}));
  for(let i=0; i<nVectors; i++) {
    dict[vocab[i]] = {vector: vectors.slice(i * VEC_SIZE, (i + 1) * VEC_SIZE), pca: pca.slice(i * 3, (i + 1) * 3)};
  }

  return dict;
}

async function loadVectors(vectorType) {
  document.getElementById('loading-p').style.display = 'block';
  document.getElementById('query-form').style.display = 'none';

  vectors = await loadVectorData(vectorType);

  document.getElementById('loading-p').style.display = 'none';
  document.getElementById('query-form').style.display = 'block';

  return vectors;
}

function asHTML(str) {
  div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function getClosestWords(form) {
  const words = form.word.value.split(/([\s,\+\-])/);
  let queryWords = []; 
  let vectorRef = new Float32Array(VEC_SIZE);
  let sign = +1;
  for(let i=0; i<words.length; i++) {
    if(words[i].length == 0 || words[i] == ' ') continue;
    if(words[i] == ',' || words[i] == '+') {
      sign = +1;
      continue;
    }
    if(words[i] == '-') {
      sign = -1;
      continue;
    }

    try {
      let vector = vectors[words[i]].vector;
      for(let j=0; j<vector.length; j++) {
        vectorRef[j] += sign * vector[j];
      }
    } catch(err) {
      document.getElementById('result').innerHTML = '<strong>' + asHTML(words[i]) + '</strong> not present in language model. Check spelling and capitalization (names of people and countries should start with a capital letter).';
      return false;
    }
    
    queryWords.push(words[i].toLowerCase());
    sign = +1;
  }

  vectorRef = normVector(vectorRef);

  let top_k = 10;
  let top_10 = [];
  for(const [word, vector] of Object.entries(vectors)) {
    if(queryWords.includes(word.toLowerCase())) {
      continue;
    }
    dist = 0;
    for(let i=0; i<vector.vector.length; i++) {
      diff = vectorRef[i] - vector.vector[i];
      dist += diff * diff;
    }
    if(top_10.length < top_k || dist < top_10[9].dist) {
      top_10.push({word: word, dist: dist});
      top_10 = top_10.sort((a, b) => a.dist - b.dist);
      top_10 = top_10.slice(0, 10);
    }
  }

  let html = '<p>Words most related to: <strong>' + asHTML(form.word.value) + '</strong></p>';
  html += '<table id="results">';
  html += '<tr><th>Word</th><th>Score</th></tr>';
  for(let i=0; i<top_10.length; i++) {
    html += '<tr><td>' + asHTML(top_10[i].word) + '</td>';
    html += '<td>' + asHTML(top_10[i].dist.toFixed(3)) + '</td></tr>';
  }
  html += '</table>';
  document.getElementById('result').innerHTML = html;
  return false
}

function addVectors(a, b) {
  res = new Float32Array(a.length);
  for(let i=0; i<a.length; i++) {
    res[i] = a[i] + b[i];
  }
  return res;
}

function subVectors(a, b) {
  res = new Float32Array(a.length);
  for(let i=0; i<a.length; i++) {
    res[i] = a[i] - b[i];
  }
  return res;
}

function normVector(a) {
  let norm = 0;
  for(let i=0; i<a.length; i++) {
    norm += a[i] * a[i];
  }
  norm = Math.sqrt(norm);
  res = new Float32Array(a.length);
  for(let i=0; i<a.length; i++) {
    res[i] = a[i] / norm;
  }
  return res;
}

function projVector(a, b) {
  let score = 0;
  for(let i=0; i<a.length; i++) {
    score += a[i] * b[i];
  }
  return score;
}

function notFound(word) {
  document.getElementById('result').innerHTML = '<strong>' + asHTML(word) + '</strong> not present in language model. Check spelling and capitalization (names of people and countries should start with a capital letter).';
}


function getComparison(form) {
  let vec = new Float32Array(VEC_SIZE);
  const neg = form.negative_words.value.split(/[\s,]/).filter(w => w.length > 0);
  const pos = form.positive_words.value.split(/[\s,]/).filter(w => w.length > 0);
  let i = 0;
  let negVec = undefined;
  let posVec = undefined;
  for(i=0; i<Math.min(neg.length, pos.length); i++) {
    try {
      negVec = vectors[neg[i]].vector;
      if(negVec == undefined) {
        notFound(neg[i]);
        return false;
      }
    } catch(err) {
      notFound(neg[i]);
      return false;
    }
    try {
      posVec = vectors[pos[i]].vector;
      if(posVec == undefined) {
        notFound(pos[i]);
        return false;
      }
    } catch(err) {
      notFound(pos[i]);
      return false;
    }
    vec = addVectors(vec, subVectors(posVec, negVec));
  }
  vec = normVector(vec);

  const words = form.words.value.split(/[\s,]/).filter(w => w.length > 0);
  let wordVecs = []
  let pcaVecs = []
  let scores = {};
  for(i=0; i<words.length; i++) {
    try {
      wordVec = vectors[words[i]].vector;
      scores[words[i]] = projVector(wordVec, vec);
      wordVecs.push(wordVec);
      pcaVecs.push(vectors[words[i]].pca);
    } catch(err) {
      notFound(words[i]);
      return false;
    }
  }

  words.sort((a, b) => scores[a] - scores[b]);

  let html = '<p>Comparing: <strong>' + asHTML(form.words.value) + '</strong></p>';
  html += '<table id="results">';
  html += '<tr><th>Word</th><th>Score</th></tr>';
  for(let i=0; i<words.length; i++) {
    html += '<tr><td>' + asHTML(words[i]) + '</td>';
    html += '<td>' + asHTML(scores[words[i]].toFixed(3)) + '</td></tr>';
  }
  html += '</table>';
  document.getElementById('result').innerHTML = html;

  drawComparison(pcaVecs, words);
  return false;
}

function drawComparison(vectors, labels) {
  let origin = [480, 300];

  let rotationX = Math.PI / 6;
  let rotationY = Math.PI / 5;
  let scale = 50;

  var point3d = d3._3d()
    .x(d => d.x)
    .y(d => d.y)
    .z(d => d.z)
    .origin(origin)
    .rotateX(rotationX)
    .rotateY(rotationY)
    .scale(scale);

  var axis = d3._3d()
    .shape('LINE')
    .origin(origin)
    .rotateX(rotationX)
    .rotateY(rotationY)
    .scale(scale);

  const j = 5;
  const axes = [
    [[0, 0, 0], [2 * j, 0, 0]],
    [[0, 0, 0], [0, -2 * j, 0]],
    [[0, 0, 0], [0, 0, -2 * j]]
  ];

  let svg = d3.select('svg');
  //const scatter = vectors.map(v => {x: v[0]; y: v[1]; z: v[2]});
  const scatter = vectors.map(function(v) {
    return {x: v[0], y: v[1], z: v[2]};
  });
  console.log(scatter);

  let points = svg.selectAll('circle').data(point3d(scatter), d => d.id);
  let groups = points.enter().append('g');
  points.exit().remove();

  groups.append('circle')
    .attr('class', 'marker')
    .attr('opacity', 0)
    .attr('cx', d => d.projected.x)
    .attr('cy', d => d.projected.y)
    .attr('r', 3)
    .attr('fill', '#000000')
    .attr('opacity', 1)
    .attr('cx', d => d.projected.x)
    .attr('cy', d => d.projected.y);

  groups.append('text')
    .attr('class', 'label')
    .attr('x', d => d.projected.x + 5)
    .attr('y', d => d.projected.y)
    .attr('fill', '#000000')
    .text((d, i) => labels[i]);

  let lines = svg.selectAll('path.axis').data(axis(axes));
  lines
    .enter()
    .append('line')
    .attr('class', 'axis')
    .attr('stroke', 'black')
    .attr('stroke-width', .5)
    .attr('x1', d => d[0].projected.x)
    .attr('y1', d => d[0].projected.y)
    .attr('x2', d => d[1].projected.x)
    .attr('y2', d => d[1].projected.y);
  lines.exit().remove();
}
