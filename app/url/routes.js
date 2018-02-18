const router = require('express').Router();
const url = require('./url');
const { domain } = require('../../environment');
const SERVER = `${domain.protocol}://${domain.host}`;


router.get('/:hash', async (req, res, next) => {

  const source = await url.getUrl(req.params.hash);

  if (source === null) return res.status(404).send(`${req.params.hash} not found`);

  // TODO: Hide fields that shouldn't be public

  // Behave based on the requested format using the 'Accept' header.
  // If header is not provided or is */* redirect instead.
  const accepts = req.get('Accept');

  switch (accepts) {
    case 'text/plain':
      res.end(source.url);
      break;
    case 'application/json':
      res.json(source);
      break;
    default:
      res.redirect(source.url);
      break;
  }
});


router.post('/', async (req, res, next) => {

  if (!req.body.url) return res.status(400).send({error: "url field is required"})
  if (!url.isValid(req.body.url)) return res.status(400).send({error: "url field is not a valid URL"})

  try {
    let shortUrl = await url.shorten(req.body.url, url.generateHash(req.body.url));
    res.json(shortUrl);
  } catch (e) {
    res.status(500).send({error: "Unexpected Error, please try again"})
    next(e);
  }
});


router.delete('/:hash/remove/:removeToken', async (req, res, next) => {
  let deleted = await url.deleteURL(req.params.hash, req.params.removeToken)
  if (deleted) return res.send({result: `${SERVER}/${req.params.hash} deleted`})
  return res.status(404).send({error: `${SERVER}${req.url} not found or the hash is incorrect`})
});

module.exports = router;
