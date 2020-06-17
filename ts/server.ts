import * as HTTP from "http";
import * as Url from "url";
import { createOAuthAppAuth } from "@octokit/auth";
import { Octokit } from "@octokit/rest";

export interface AccessTokenData {
  type: string;
  tokenType: string;
  token: string;
  scopes: string[];
}

export interface Parameters {
  action: string | null;
  at: string | null;
  repoName: string | null;
  repoPath: string | null;
  fileName: string | null;
  path: string | null;
  name: string | null;
  sha: string | null;
  state: string | null;
  code: string | null;
}

const CLIENT_ID: string = "47db66f43b3e5e0c0b25";
const CLIENT_SECRET: string = "d1abfd3be9efe995399faad6a2f947b2dc4149a9";
const SCOPE: string = "repo, user";

namespace FreeMindViewer {
  let server: HTTP.Server = HTTP.createServer();
  let port: number | string | undefined = process.env.PORT;

  if (port == undefined)
    port = 5001;

  server.listen(port);
  server.addListener("request", handleRequest);

  async function handleRequest(_request: HTTP.IncomingMessage, _response: HTTP.ServerResponse): Promise<void> {
    if (_request.url) {

      _response.setHeader("Access-Control-Allow-Origin", "*");
      _response.setHeader("Content-Type", "json");

      let url: Url.UrlWithParsedQuery = Url.parse(_request.url, true);
      let parameters: Parameters = getParameters(url);
      console.log(parameters);
      if (parameters.action) {
        switch (parameters.action) {
          case "auth":
            await auth(_request, _response, CLIENT_ID, SCOPE, parameters);
            break;
          case "fetchToken":
            await fetchToken(_request, _response, parameters);
        }
      }
    }
    _response.end();
  }

  function getParameters(_url: Url.UrlWithParsedQuery): Parameters {

    let parameters: Parameters = {
      action: _url.query["a"] ? <string>_url.query["a"] : null,
      at: _url.query["at"] ? <string>_url.query["at"] : null,
      repoName: _url.query["name"] ? <string>_url.query["name"] : null,
      repoPath: _url.query["path"] ? <string>_url.query["path"] : null,
      fileName: _url.query["fileName"] ? <string>_url.query["fileName"] : null,
      path: _url.query["path"] ? <string>_url.query["path"] : null,
      name: _url.query["owner"] ? <string>_url.query["owner"] : null,
      sha: _url.query["sha"] ? <string>_url.query["sha"] : null,
      state: _url.query["state"] ? <string>_url.query["state"] : null,
      code: _url.query["code"] ? <string>_url.query["code"] : null
    };

    return parameters;
  }

  async function auth(_request: HTTP.IncomingMessage, _response: HTTP.ServerResponse, _CLIENT_ID: string, _SCOPE: string, _parameters: Parameters): Promise<void> {
    if (!_parameters.state)
      return;

    let url: string = "https://github.com/login/oauth/authorize";
    let params: URLSearchParams = new URLSearchParams("client_id=" + _CLIENT_ID + "&state=" + _parameters.state + "&scope=" + _SCOPE);
    url += "?" + params.toString();
    _response.writeHead(302, {
      "Location": url
    });
  }

  async function fetchToken(_request: HTTP.IncomingMessage, _response: HTTP.ServerResponse, _parameters: Parameters): Promise<void> {
    if (_parameters.code && _parameters.state) {

      const auth = createOAuthAppAuth({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      });
      const appAuthentication: {} = await auth({
        type: "token",
        code: _parameters.code,
        state: _parameters.state
      });

      let result: string = JSON.stringify(appAuthentication);
      let data: AccessTokenData = JSON.parse(result);

      _response.write(data ? data.token : "Err:#10001: No data available");
    }
    else {
      _response.write("Err:#10002: No token or state provided");
    }
  }
}