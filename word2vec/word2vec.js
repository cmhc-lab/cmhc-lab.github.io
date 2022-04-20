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
    const request = indexedDB.open('vectors', 2);
    request.onsuccess = e => resolve(e.target.result);

    request.onerror = function(e) {
      console.error(`connect error: ${ e.target.errorCode }`);
      reject();
    };

    request.onupgradeneeded = function(e) {
      if(e.oldVersion === 0) {
        vectors = request.result.createObjectStore('vectors', {keyPath: 'key'});
      }
    }
  });
}

async function loadVectors() {
  const db = await dbConnect();

  let dataPresent = await new Promise(resolve => {
    const trans = db.transaction('vectors', 'readonly');
    let store = trans.objectStore('vectors');
    store.count().onsuccess = e => resolve(e.target.result);
  })
  if(dataPresent >= 2) {
    console.log('We already have data.');

    let nVectors = 0;
    let vocab = await new Promise(resolve => {
      const trans = db.transaction('vectors', 'readonly');
      let store = trans.objectStore('vectors');
      let request = store.get('vocab');
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
    });
    vocab = vocab.text.split('\r\n');
    let vectorsBlob = await new Promise(resolve => {
      const trans = db.transaction('vectors', 'readonly');
      let store = trans.objectStore('vectors');
      let request = store.get('vectors');
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
    });
    vectors = new Float32Array(await blobToArrayBuffer(new Blob([vectorsBlob.blob], {type: 'application/octet-stream'})));
    const dict = {};
    for(let i=0; i<vocab.length; i++) {
      dict[vocab[i]] = vectors.slice(i * 300, (i + 1) * 300);
    }
    return dict;
  }

  console.log('Downloading data...');

  const VEC_SIZE_BYTES = 4 * 300;

  let response = await fetch('https://www.googleapis.com/drive/v3/files/1XnnCAKDD4ePAZVpM9rzgclfFMFVIOTDO?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM');
  const text = await blobToText(await response.blob());
  const vocab = text.split('\r\n');
  const nVectors = vocab.length;

  response = await fetch('https://www.googleapis.com/drive/v3/files/1cddc2pjjOwKrOBAWyUbhFJFyitO4ggXU?alt=media&key=AIzaSyDaUUCy1-EwjzZZ95H1vZCww1V02X7d-kM')
  const reader = response.body.getReader();
  let bytesRead = 0;
  let vectsRead = 0;
  const dict = {};
  const buf = new Uint8Array(nVectors * VEC_SIZE_BYTES);

  while(true) {
    const {done, value} = await reader.read();
    if(done) {
      break;
    }

    buf.set(value, bytesRead);
    bytesRead += value.length;
    document.getElementById('loading-w2v').value = (bytesRead) / buf.length;
  }

  console.log('Storing vectors in local database')
  await new Promise(resolve => {
    const trans = db.transaction('vectors', 'readwrite');
    trans.oncomplete = resolve;
    const store = trans.objectStore('vectors');
    store.put({key: 'vectors', blob: buf});
  });
  await new Promise(resolve => {
    const trans = db.transaction('vectors', 'readwrite');
    trans.oncomplete = resolve;
    const store = trans.objectStore('vectors');
    store.put({key: 'vocab', text: text});
  });

  vectors = new Float32Array(await blobToArrayBuffer(new Blob([buf.buffer], {type: 'application/octet-stream'})));
  for(let i=0; i<nVectors; i++) {
    dict[vocab[i]] = vectors.slice(i * 300, (i + 1) * 300);
  }

  return dict;
}

async function loadWord2Vec() {
  document.getElementById('loading-p').style.display = 'block';
  document.getElementById('query-form').style.display = 'none';

  vectors = await loadVectors();

  document.getElementById('loading-p').style.display = 'none';
  document.getElementById('query-form').style.display = 'block';

  return vectors;
}

var vectors = undefined;
window.onload = async function(e) {
  vectors = await loadWord2Vec();
};

function asHTML(str) {
  div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function getClosestWords(form) {
  const words = form.word.value.split(/([\s,\+\-])/);
  let queryWords = []; 
  let vectorRef = new Float32Array(300);
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
      let vector = vectors[words[i]];
      for(let j=0; j<300; j++) {
        vectorRef[j] += sign * vector[j];
      }
    } catch(err) {
      document.getElementById('result').innerHTML = '<strong>' + asHTML(words[i]) + '</strong> not present in language model. Check spelling and capitalization (names of people and countries should start with a capital letter).';
      return false;
    }
    
    queryWords.push(words[i].toLowerCase());
    sign = +1;
  }

  let vectorRefLength = Math.sqrt(vectorRef.reduce((partialSum, a) => partialSum + a * a, 0));
  vectorRef = vectorRef.map(a => a / vectorRefLength);

  console.log(`Vector for ${queryWords}`);
  console.log(vectorRef);

  let top_k = 10;
  let top_10 = [];
  for(const [word, vector] of Object.entries(vectors)) {
    if(queryWords.includes(word.toLowerCase())) {
      continue;
    }
    dist = 0;
    for(let i=0; i<300; i++) {
      diff = vectorRef[i] - vector[i];
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
  let vec = new Float32Array(300);
  const neg = form.negative_words.value.split(/[\s,]/).filter(w => w.length > 0);
  const pos = form.positive_words.value.split(/[\s,]/).filter(w => w.length > 0);
  console.log(neg, pos, Math.min(neg.length, pos.length));
  let i = 0;
  let negVec = undefined;
  let posVec = undefined;
  for(i=0; i<Math.min(neg.length, pos.length); i++) {
    try {
      negVec = vectors[neg[i]];
      if(negVec == undefined) {
        notFound(neg[i]);
        return false;
      }
    } catch(err) {
      notFound(neg[i]);
      return false;
    }
    try {
      posVec = vectors[pos[i]];
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
  let scores = {};
  for(i=0; i<words.length; i++) {
    try {
      scores[words[i]] = projVector(vectors[words[i]], vec);
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
  return false;
}
