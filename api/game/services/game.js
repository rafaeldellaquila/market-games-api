"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

const axios = require("axios");
const slugify = require("slugify");
const qs = require("querystring");
function Exception(error) {
  return { error, data: error.data && error.data.errors && error.data.errors };
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getGameInfo(slug) {
  try {
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    const body = await axios.get(`https://www.gog.com/game/${slug}`);
    const dom = new JSDOM(body.data);

    const ratingElement = dom.window.document.querySelector(
      ".age-restrictions__icon"
    );
    const description = dom.window.document.querySelector(".description");
    return {
      rating: ratingElement
        ? ratingElement
            .getAttribute("xlink:href")
            .replace(/_/g, "")
            .replace(/[^w-]+/g, "")
        : "BR0",
      short_description: description.textContent.slice(0, 160),
      description: description.innerHTML,
    };
  } catch (error) {
    console.log("getGameInfo", Exception(error));
  }
}

async function getByName(name, entityName) {
  const item = await strapi.services[entityName].find({ name });
  return item.length ? item[0] : null;
}

async function create(name, entityName) {
  const item = await getByName(name, entityName);

  if (!item) {
    return await strapi.services[entityName].create({
      name,
      slug: slugify(name, { lower: true }),
    });
  }
}

async function createManyToManyData(products) {
  //Recebe o meu array de products
  const developers = {};
  const publishers = {};
  const categories = {};
  const platforms = {};
  //As propriedades que quero salvar no banco, iniciando como um objeto

  //iterando nos meus products e pegando cada um dos products
  products.forEach((product) => {
    const { developer, publisher, genres, supportedOperatingSystems } = product;
    //se ja estão preenchidos, se tiver, salvo a chave
    genres &&
      genres.forEach((item) => {
        categories[item] = true;
      });
    supportedOperatingSystems &&
      supportedOperatingSystems.forEach((item) => {
        platforms[item] = true;
      });
    developers[developer] = true;
    publishers[publisher] = true;
  });
  //ta pegando todas as minhas promisses e resolve-las
  return Promise.all([
    ...Object.keys(developers).map((name) => create(name, "developer")),
    ...Object.keys(publishers).map((name) => create(name, "publisher")),
    ...Object.keys(categories).map((name) => create(name, "category")),
    ...Object.keys(platforms).map((name) => create(name, "platform")),
  ]);
}

async function setImage({ image, game, field = "cover" }) {
  //Pego a imagem no padrao da imagem e crio um buffer para essa imagem
  try {
    const url = `https:${image}_bg_crop_1680x655.jpg`;
    const { data } = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(data, "base64");

    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("refId", game.id);
    formData.append("ref", "game");
    formData.append("field", field);
    formData.append("files", buffer, { filename: `${game.slug}.jpg` });

    console.info(`uploading ${field} image: ${game.slug}.jpg`);

    await axios({
      method: "POST",
      url: `http://${strapi.config.host}:${strapi.config.port}/upload`,
      data: formData,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
      },
    });
  } catch (error) {
    console.log("setImage", Exception(error));
  }
}

async function createGames(products) {
  //recebe o array de produtos e faz o map dos produtos
  await Promise.all(
    products.map(async (product) => {
      const item = await getByName(product.title, "game");
      //se o item não existir, segue
      if (!item) {
        console.info(`Creating: ${product.title}...`);

        const game = await strapi.services.game.create({
          name: product.title,
          slug: product.slug.replace(/_/g, "-"), //replace do _ pelo - pra padronizar o strapi
          price: product.price.amount,
          release_date: new Date(
            Number(product.globalReleaseDate) * 1000
          ).toISOString(), // esse trecho está transformando o dado UNIX que recebemos para o strapi conseguir identificar a daata
          categories: await Promise.all(
            product.genres.map((name) => getByName(name, "category"))
          ),
          platforms: await Promise.all(
            product.supportedOperatingSystems.map((name) =>
              getByName(name, "platform")
            ) // por ser mais de uma cat e plat estou fazendo promise all aqui também
          ),
          developers: [await getByName(product.developer, "developer")],
          publisher: await getByName(product.publisher, "publisher"),
          ...(await getGameInfo(product.slug)), // desestruturação do jsdom que puxamos da gog
        });
        await setImage({ image: product.image, game });
        await Promise.all(
          product.gallery
            .slice(0, 5)
            .map((url) => setImage({ image: url, game, field: "gallery" }))
        );

        await timeout(3000);
        return game;
      }
    })
  );
}

module.exports = {
  populate: async (params) => {
    try {
      const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&${qs.stringify(
        params
      )}`;
      const {
        data: { products },
      } = await axios.get(gogApiUrl);

      await createManyToManyData(products);
      await createGames(products);
    } catch (error) {
      console.log("populate", Exception(error));
    }
  },
};
