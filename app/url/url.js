const uuidv4 = require('uuid/v4');
const { domain } = require('../../environment');
const SERVER = `${domain.protocol}://${domain.host}`;

const UrlModel = require('./schema');
const parseUrl = require('url').parse;
const validUrl = require('valid-url');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const ID_LENGTH = 6;

function generate() {
  let rtn = '';
  for (var i = 0; i < ID_LENGTH; i++) {
    rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
}

/**
 * Lookup for existant, active shortened URLs by hash.
 * 'null' will be returned when no matches were found.
 * if found, will register a visit
 * @param {string} hash
 * @returns {object}
 */
async function getUrl(hash) {
  let source = await UrlModel.findOneAndUpdate(
    {active: true, hash},
    {
      $push: {
        visits: {date: Date.now()}
      }
    });
  return source;
}

/**
 * Looks for existent, active shortened URLs and removeToken by hash
 * if exists will logical delete
 * if not, will return null
 * @param {string} hash
 * @param {string} removeToken
 * @returns {object}
 */
async function deleteURL(hash, removeToken) {
  let result = await UrlModel.findOneAndUpdate({active: true, hash, removeToken}, {
    $set: {
      active: false,
      removedAt: new Date()
    }
  })
  return result
}

/**
 * Generate an unique hash-ish- for an URL.
 * @param {string} id
 * @returns {string} hash
 */
function generateHash(url) {
  return `${(+new Date).toString(36)}-${generate()}`;
}

/**
 * Generate a random token that will allow URLs to be (logical) removed
 * @returns {string} hash
 */
function generateRemoveToken() {
  return `${(+new Date).toString(36)}-${generate()}`;
}

/**
 * Create an instance of a shortened URL in the DB.
 * Parse the URL destructuring into base components (Protocol, Host, Path).
 * An Error will be thrown if the URL is not valid or saving fails.
 * @param {string} url
 * @param {string} hash
 * @returns {object}
 */
async function shorten(url, hash) {

  if (!isValid(url)) {
    throw new Error('Invalid URL');
  }

  // Get URL components for metrics sake
  const urlComponents = parseUrl(url);
  const protocol = urlComponents.protocol || '';
  const domain = `${urlComponents.host || ''}${urlComponents.auth || ''}`;
  const path = `${urlComponents.path || ''}${urlComponents.hash || ''}`;

  // Generate a token that will alow an URL to be removed (logical)
  const removeToken = generateRemoveToken();

  // Create a new model instance
  const shortUrl = new UrlModel({
    url,
    protocol,
    domain,
    path,
    hash,
    isCustom: false,
    removeToken,
    active: true
  });

  const saved = await shortUrl.save();

  return {
    url,
    shorten: `${SERVER}/${hash}`,
    hash,
    removeUrl: `${SERVER}/${hash}/remove/${removeToken}`
  };

}

/**
 * Validate URI
 * @param {any} url
 * @returns {boolean}
 */
function isValid(url) {
  return validUrl.isUri(url);
}

module.exports = {
  shorten,
  getUrl,
  generateHash,
  generateRemoveToken,
  isValid,
  deleteURL
}
