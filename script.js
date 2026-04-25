let model;
let vocab = {};
let maxLen = 12;

function limpiarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function entrenarModelo() {
  const response = await fetch("dataset.json");
  const data = await response.json();

  const textos = data.map(d => limpiarTexto(d.text));
  const labels = data.map(d => d.label);

  let index = 1;

  textos.forEach(texto => {
    texto.split(" ").forEach(palabra => {
      if (!vocab[palabra]) {
        vocab[palabra] = index++;
      }
    });
  });

  const X = textos.map(texto => {
    let seq = texto.split(" ").map(palabra => vocab[palabra] || 0);
    while (seq.length < maxLen) seq.push(0);
    return seq.slice(0, maxLen);
  });

  const xs = tf.tensor2d(X);
  const ys = tf.tensor2d(labels, [labels.length, 1]);

  model = tf.sequential();

  model.add(tf.layers.embedding({
    inputDim: index + 1,
    outputDim: 8,
    inputLength: maxLen
  }));

  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"]
  });

  await model.fit(xs, ys, {
    epochs: 50
  });

  console.log("Modelo entrenado correctamente");
}

async function analizar() {
  const texto = limpiarTexto(document.getElementById("texto").value);
  const resultado = document.getElementById("resultado");

  if (!model) {
    resultado.innerHTML = "El modelo aún está entrenando...";
    return;
  }

  let seq = texto.split(" ").map(palabra => vocab[palabra] || 0);
  while (seq.length < maxLen) seq.push(0);
  seq = seq.slice(0, maxLen);

  const input = tf.tensor2d([seq]);
  const prediccion = model.predict(input);

  const valor = (await prediccion.data())[0];

  if (valor >= 0.5) {
    resultado.innerHTML = `Resultado: ${(valor * 100).toFixed(1)}% Positivo`;
  } else {
    resultado.innerHTML = `Resultado: ${((1 - valor) * 100).toFixed(1)}% Negativo`;
  }
}

entrenarModelo();