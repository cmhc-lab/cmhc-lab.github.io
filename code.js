function shuffle(array) {
  for(let i=array.length - 1; i>=0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

async function writeCode() {
  let files = [
    'https://raw.githubusercontent.com/cmhc-lab/viswordrec-baseline/main/network.py',
    'https://raw.githubusercontent.com/cmhc-lab/viswordrec-baseline/main/train_net.py',
    'https://raw.githubusercontent.com/cmhc-lab/viswordrec-baseline/main/dataloader.py',
  ]
  shuffle(files);
  console.log(files);
  for(let file of files) {
    await writeFile(file);
  }
}

async function writeFile(url) {
  const response = await fetch(url);
  let content = await response.text();
  content = content.replace(/    /g, ' ');
  const code = document.getElementById('code');
  code.textContent = '';
  let i = 0;

  return new Promise(function(resolve) {
    function writer() {
      if(window.innerWidth < 900) {
        return;
      }
      if(i == content.length) {
        resolve();
      }
      code.textContent += content.charAt(i);
      code.scrollTop = code.scrollHeight;
      i++;
      setTimeout(writer, 50);
    }

    writer();
  });
}

writeCode();
