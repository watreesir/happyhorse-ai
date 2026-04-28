export function respData(data: any) {
  return respJson(0, 'ok', data || []);
}

export function respOk() {
  return respJson(0, 'ok');
}

export function respErr(
  message: string,
  options: { status?: number; code?: number; data?: any } = {}
) {
  return respJson(options.code ?? -1, message, options.data, {
    status: options.status ?? 200,
  });
}

export function respJson(
  code: number,
  message: string,
  data?: any,
  init?: ResponseInit
) {
  let json = {
    code: code,
    message: message,
    data: data,
  };
  if (data) {
    json['data'] = data;
  }

  return Response.json(json, init);
}
