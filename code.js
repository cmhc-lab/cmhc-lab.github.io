async function writeCode() {
  await writeFile('https://raw.githubusercontent.com/cmhc-lab/viswordrec-baseline/main/network.py');
  await writeFile('https://raw.githubusercontent.com/cmhc-lab/viswordrec-baseline/main/train_net.py');
  await writeFile('https://raw.githubusercontent.com/cmhc-lab/viswordrec-baseline/main/dataloader.py');
}

async function writeFile(url) {
  const response = await fetch(url);
  let content = await response.text();
  content = content.replace(/    /g, ' ');
  const code = document.getElementById('code');
  code.innerHTML = '';
  let i = 0;

  return new Promise(function(resolve) {
    function writer() {
      if(i == content.length) {
        resolve();
      }
      code.innerHTML += content.charAt(i);
      code.scrollTop = code.scrollHeight;
      i++;
      setTimeout(writer, 50);
    }

    writer();
  });
}

writeCode();
