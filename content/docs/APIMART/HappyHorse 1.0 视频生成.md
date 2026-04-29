> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.apimart.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# HappyHorse 1.0 视频生成

> - 阿里云百炼 HappyHorse 1.0 视频生成模型（统一入口，单模型自动路由）

- 根据传入字段自动路由：T2V（仅 prompt）/ I2V（first_frame_image）/ R2V（image_urls）/ EDIT（video_url）
- 支持 720P/1080P 分辨率，3-15 秒任意整数时长
- 仅按分辨率 × 视频秒数计费，与具体能力无关

<RequestExample>
  ```bash cURL theme={null}
  curl --request POST \
    --url https://api.apimart.ai/v1/videos/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "happyhorse-1.0",
      "prompt": "一个小女孩走在路上，电影感画面",
      "resolution": "1080P",
      "size": "16:9",
      "duration": 5,
      "seed": 42
    }'
  ```

```python Python theme={null}
import requests

url = "https://api.apimart.ai/v1/videos/generations"

payload = {
    "model": "happyhorse-1.0",
    "prompt": "一个小女孩走在路上，电影感画面",
    "resolution": "1080P",
    "size": "16:9",
    "duration": 5,
    "seed": 42
}

headers = {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript JavaScript theme={null}
const url = 'https://api.apimart.ai/v1/videos/generations';

const payload = {
  model: 'happyhorse-1.0',
  prompt: '一个小女孩走在路上，电影感画面',
  resolution: '1080P',
  size: '16:9',
  duration: 5,
  seed: 42,
};

const headers = {
  Authorization: 'Bearer <token>',
  'Content-Type': 'application/json',
};

fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(payload),
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error('Error:', error));
```

```go Go theme={null}
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

func main() {
    url := "https://api.apimart.ai/v1/videos/generations"

    payload := map[string]interface{}{
        "model":      "happyhorse-1.0",
        "prompt":     "一个小女孩走在路上，电影感画面",
        "resolution": "1080P",
        "size":       "16:9",
        "duration":   5,
        "seed":       42,
    }

    jsonData, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    req.Header.Set("Authorization", "Bearer <token>")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, _ := ioutil.ReadAll(resp.Body)
    fmt.Println(string(body))
}
```

```java Java theme={null}
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

public class Main {
    public static void main(String[] args) throws Exception {
        String url = "https://api.apimart.ai/v1/videos/generations";

        String payload = """
        {
          "model": "happyhorse-1.0",
          "prompt": "一个小女孩走在路上，电影感画面",
          "resolution": "1080P",
          "size": "16:9",
          "duration": 5,
          "seed": 42
        }
        """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer <token>")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        System.out.println(response.body());
    }
}
```

```php PHP theme={null}
<?php

$url = "https://api.apimart.ai/v1/videos/generations";

$payload = [
    "model" => "happyhorse-1.0",
    "prompt" => "一个小女孩走在路上，电影感画面",
    "resolution" => "1080P",
    "size" => "16:9",
    "duration" => 5,
    "seed" => 42
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer <token>",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>
```

```ruby Ruby theme={null}
require 'net/http'
require 'json'
require 'uri'

url = URI("https://api.apimart.ai/v1/videos/generations")

payload = {
  model: "happyhorse-1.0",
  prompt: "一个小女孩走在路上，电影感画面",
  resolution: "1080P",
  size: "16:9",
  duration: 5,
  seed: 42
}

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = "Bearer <token>"
request["Content-Type"] = "application/json"
request.body = payload.to_json

response = http.request(request)
puts response.body
```

```swift Swift theme={null}
import Foundation

let url = URL(string: "https://api.apimart.ai/v1/videos/generations")!

let payload: [String: Any] = [
    "model": "happyhorse-1.0",
    "prompt": "一个小女孩走在路上，电影感画面",
    "resolution": "1080P",
    "size": "16:9",
    "duration": 5,
    "seed": 42
]

var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("Bearer <token>", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let error = error {
        print("Error: \(error)")
        return
    }

    if let data = data, let responseString = String(data: data, encoding: .utf8) {
        print(responseString)
    }
}

task.resume()
```

```csharp C# theme={null}
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        var url = "https://api.apimart.ai/v1/videos/generations";

        var payload = @"{
            ""model"": ""happyhorse-1.0"",
            ""prompt"": ""一个小女孩走在路上，电影感画面"",
            ""resolution"": ""1080P"",
            ""size"": ""16:9"",
            ""duration"": 5,
            ""seed"": 42
        }";

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("Authorization", "Bearer <token>");

        var content = new StringContent(payload, Encoding.UTF8, "application/json");
        var response = await client.PostAsync(url, content);
        var result = await response.Content.ReadAsStringAsync();

        Console.WriteLine(result);
    }
}
```

</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "code": 200,
    "data": [
      {
        "status": "submitted",
        "task_id": "task_01J9HA7JPQ9A0Z6JZ3V8M9W6PZ"
      }
    ]
  }
  ```

```json 400 theme={null}
{
  "error": {
    "code": 400,
    "message": "请求参数无效",
    "type": "invalid_request_error"
  }
}
```

```json 401 theme={null}
{
  "error": {
    "code": 401,
    "message": "身份验证失败，请检查您的API密钥",
    "type": "authentication_error"
  }
}
```

```json 402 theme={null}
{
  "error": {
    "code": 402,
    "message": "账户余额不足，请充值后再试",
    "type": "payment_required"
  }
}
```

```json 429 theme={null}
{
  "error": {
    "code": 429,
    "message": "请求过于频繁，请稍后再试",
    "type": "rate_limit_error"
  }
}
```

```json 500 theme={null}
{
  "error": {
    "code": 500,
    "message": "服务器内部错误，请稍后重试",
    "type": "server_error"
  }
}
```

</ResponseExample>

## 认证

<ParamField header="Authorization" type="string" required>
  所有接口均需要使用 Bearer Token 进行认证

获取 API Key：

访问 [API Key 管理页面](https://apimart.ai/keys) 获取您的 API Key

使用时在请求头中添加：

```
Authorization: Bearer YOUR_API_KEY
```

</ParamField>

## 模式路由

`happyhorse-1.0` 是文生视频 / 图生视频 / 参考图生视频 / 视频编辑的统一入口，后端根据传入参数自动判断模式，**所有模式按统一规则计费（仅按分辨率 × 秒）**：

| 你传的字段                                                                      | 路由到              | 模式说明                |
| ------------------------------------------------------------------------------- | ------------------- | ----------------------- |
| 仅 `prompt`                                                                     | 文生视频（T2V）     | 纯文字描述生成视频      |
| `prompt` + `first_frame_image`                                                  | 图生视频（I2V）     | 以图为首帧动起来        |
| `prompt` + `image_urls`（1\~9 张）                                              | 参考图生视频（R2V） | 一组参考图生成全新画面  |
| `prompt` + `video_url`（可选 `image_urls` 0\~5 张作风格参考 / `audio_setting`） | 视频编辑（EDIT）    | 对源视频进行改写/风格化 |

**路由优先级**（从高到低）：`video_url` > `first_frame_image` > `image_urls` > 仅 `prompt`。

**字段互斥规则**：三个媒体字段（`first_frame_image` / `image_urls` / `video_url`）**两两互斥**，唯一例外是 `video_url + image_urls`（EDIT 模式 + 参考图）是合法组合。同时传两个互斥字段会返回 400 `mixed_media_not_allowed`。

## 请求参数

<ParamField body="model" type="string" required>
  视频生成模型名称，固定为 `happyhorse-1.0`
</ParamField>

<ParamField body="prompt" type="string">
  视频内容描述，最多 2500 字符，不能包含特殊 token

- **T2V / R2V / EDIT 模式**：必填
- **I2V 模式**：可选，但建议填写以指导运镜和动作

示例：`"一个小女孩走在路上，电影感画面"`
</ParamField>

<ParamField body="first_frame_image" type="string">
  首帧图片，触发 **I2V**（图生视频）。支持 URL 或 base64（`data:image/<mime>;base64,<payload>`，网关自动转储到 OSS）

与 `image_urls` / `video_url` 互斥

  <Note>
    **首帧图片要求：**

    * 格式：JPEG / JPG / PNG / BMP / WEBP
    * 短边像素：≥ 300px
    * 宽高比：`1:2.5 ~ 2.5:1`
    * 大小：≤ 10MB

  </Note>
</ParamField>

<ParamField body="image_urls" type="array<string>">
  图片数组：

- **R2V 模式**（仅传 `image_urls`）：1\~9 张，作为主体/风格参考生成全新画面
- **EDIT 模式**（同时传 `video_url`）：0\~5 张，作为风格参考图

支持 URL 或 base64

与 `first_frame_image` 互斥；可与 `video_url` 同时使用

  <Note>
    **参考图要求：**

    * 格式：JPEG / JPG / PNG / BMP / WEBP
    * 短边像素：推荐 ≥ 720p
    * 宽高比：短边 / 长边 ≥ 0.4
    * 大小：≤ 10MB
    * 数量：R2V 必须 1\~9 张；EDIT 最多 5 张

  </Note>
</ParamField>

<ParamField body="video_url" type="string">
  源视频 URL，触发 **EDIT**（视频编辑）。**暂不支持 base64**，请提供 HTTP/HTTPS 直链

与 `first_frame_image` 互斥；可与 `image_urls`（≤ 5 张）同时使用

  <Note>
    **源视频要求：**

    * 时长：3 \~ 60 秒（> 15s 上游自动从 0 截到 15s）
    * 分辨率：最小 480p，短边 ≥ 360
    * 宽高比：`1:8 ~ 8:1`
    * 格式：MP4 / MOV（建议 H.264 编码）
    * 帧率：> 8 fps
    * 大小：≤ 100MB

  </Note>

  <Warning>
    **EDIT 模式下生成视频的时长与源视频一致**（源视频 > 15s 时按截取后的 15s 计算），此时 `duration` 参数不生效。如需控制输出时长，请先自行将源视频裁剪到目标长度后再上传。
  </Warning>
</ParamField>

<ParamField body="audio_setting" type="string" default="auto">
  音频设置，**仅 EDIT 模式生效**（必须同时传 `video_url`）

可选值：

- `auto` - 自动生成音频（默认）
- `origin` - 保留原视频音轨

  <Warning>
    在非 EDIT 模式下传该字段会返回 400 `audio_setting_only_for_edit`
  </Warning>
</ParamField>

<ParamField body="resolution" type="string" default="1080P">
  视频分辨率（影响计费）

可选值：

- `720P` - 标清
- `1080P` - 高清（默认）
  </ParamField>

<ParamField body="duration" type="integer" default="5">
  视频时长（秒，影响计费）

支持范围：`3` \~ `15` 的任意整数

默认值：`5`

  <Warning>
    **EDIT 模式（传入 `video_url`）下此参数不生效**：生成视频的时长与源视频保持一致（源视频 > 15s 时按截取后的 15s 计费）。如需控制输出时长，请先自行裁剪源视频。
  </Warning>
</ParamField>

<ParamField body="size" type="string" default="16:9">
  画面宽高比

支持的格式：

- `16:9` - 横版宽屏（默认）
- `9:16` - 竖版长屏
- `1:1` - 正方形
- `4:3` - 横版
- `3:4` - 竖版

  <Warning>
    **I2V / EDIT 模式下此参数会被忽略**，输出宽高比由输入媒体（首帧图 / 源视频）自动决定
  </Warning>
</ParamField>

<ParamField body="seed" type="integer">
  随机种子，用于控制生成内容的随机性

取值范围：`[0, 2147483647]`，省略则随机

  <Note>
    * 相同的请求下，模型收到不同的 seed 值（如：不指定 seed 值），将生成不同的结果
    * 相同的请求下，模型收到相同的 seed 值，会生成类似的结果，但不保证完全一致
  </Note>
</ParamField>

## 响应

<ResponseField name="code" type="integer">
  响应状态码，成功时为 200
</ResponseField>

<ResponseField name="data" type="array">
  返回数据数组

  <Expandable title="数组元素">
    <ResponseField name="status" type="string">
      任务状态，初始提交时为 `submitted`
    </ResponseField>

    <ResponseField name="task_id" type="string">
      任务唯一标识符，用于查询任务状态和结果
    </ResponseField>

  </Expandable>
</ResponseField>

## 使用场景

### 场景 1：文生视频 T2V（最简请求）

```json theme={null}
{
  "model": "happyhorse-1.0",
  "prompt": "一个小女孩走在路上，电影感画面"
}
```

### 场景 2：文生视频 T2V（完整参数）

```json theme={null}
{
  "model": "happyhorse-1.0",
  "prompt": "夕阳下的海边公路，慢镜头推进，电影感画面",
  "resolution": "1080P",
  "size": "16:9",
  "duration": 8,
  "seed": 42
}
```

### 场景 3：图生视频 I2V（first_frame_image）

```json theme={null}
{
  "model": "happyhorse-1.0",
  "prompt": "让图片中的场景动起来",
  "first_frame_image": "https://example.com/first_frame.png",
  "resolution": "1080P",
  "duration": 5
}
```

### 场景 4：参考图生视频 R2V（多张参考图）

```json theme={null}
{
  "model": "happyhorse-1.0",
  "prompt": "图1中的主角在图2的场景中奔跑，随后拿起图3中的道具。画面保持3D卡通风格，动作流畅。",
  "image_urls": [
    "https://example.com/img_01.jpg",
    "https://example.com/img_02.png",
    "https://example.com/img_03.jpeg"
  ],
  "resolution": "1080P",
  "size": "16:9",
  "duration": 5
}
```

### 场景 5：视频编辑 EDIT（保留原音轨 + 风格参考）

```json theme={null}
{
  "model": "happyhorse-1.0",
  "prompt": "把视频中的角色换成卡通风格，保留原有动作",
  "video_url": "https://example.com/source.mp4",
  "image_urls": ["https://example.com/style_ref.jpg"],
  "resolution": "1080P",
  "audio_setting": "origin",
  "seed": 42
}
```

### 场景 6：720P 节省额度

```json theme={null}
{
  "model": "happyhorse-1.0",
  "prompt": "海浪拍打沙滩，日落时分",
  "resolution": "720P",
  "size": "16:9",
  "duration": 5
}
```

## 模式选择建议

| 需求                         | 推荐方式                                                      |
| ---------------------------- | ------------------------------------------------------------- |
| 纯文字描述生成视频           | 仅传 `prompt`（T2V）                                          |
| 让图片"动起来"（以图为首帧） | 传 `first_frame_image`（I2V）                                 |
| 用一组参考图生成全新画面     | 传 `image_urls`（1\~9 张，R2V）                               |
| 对已有视频改写 / 风格化      | 传 `video_url`（EDIT），可叠加 `image_urls` 0\~5 张做风格参考 |
| 节省额度                     | 指定 `resolution: "720P"`                                     |

## 使用建议

1. **统一入口逻辑**：根据传入字段自动路由模式，注意三个媒体字段（`first_frame_image` / `image_urls` / `video_url`）两两互斥
2. **size 仅 T2V/R2V 生效**：I2V / EDIT 模式下 `size` 会被忽略，输出宽高比由输入媒体决定
3. **时长建议**：5\~10 秒为甜点区，过短动作不连贯，过长上游耗时显著增加
4. **首帧图片质量**：清晰、构图明确、主体居中，能显著提升 I2V 效果
5. **prompt 写作**：描述运动 / 镜头 / 氛围（如 "缓慢推近、电影感、暖色调"），比单纯描述静态场景效果更好
6. **EDIT 输入视频**：> 15 秒会被上游自动从 0 秒截取到 15 秒，需要其他片段请先自行切片

<Note>
  **查询任务结果**

视频生成为异步任务，提交后会返回 `task_id`。使用 [获取任务状态](/cn/api-reference/tasks/status) 接口查询生成进度和结果。
</Note>
