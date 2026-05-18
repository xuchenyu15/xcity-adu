using Microsoft.AspNetCore.Mvc;

namespace XBuildApi.Controllers;

/// <summary>
/// 健康检查接口。
/// 用于负载均衡探活、部署验证与基础连通性检查，不涉及任何外部依赖或业务计算。
/// </summary>
[ApiController]
public sealed class HealthController : ControllerBase
{
    /// <summary>
    /// 服务健康检查。
    /// </summary>
    /// <remarks>
    /// 返回结构固定：{ ok: true }。
    /// </remarks>
    /// <returns>HTTP 200，表示服务可用。</returns>
    [HttpGet("/api/health")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new { ok = true });
}

