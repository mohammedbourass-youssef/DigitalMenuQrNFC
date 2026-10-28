using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Controllers
{
    [Route("api/features")]
    [ApiController]
    [Authorize]
    public class FeaturesController : ControllerBase
    {
        private readonly IFeatureRepo _repo;
        private readonly ILogger<FeaturesController> _logger;

        public FeaturesController(IFeatureRepo repo, ILogger<FeaturesController> logger)
        {
            _repo = repo;
            _logger = logger;
        }

        [HttpGet]
        [ProducesResponseType(typeof(List<FeatureDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult> GetAll(CancellationToken ct)
        {
            try
            {
                var features = await _repo.GetAllAsync(ct);
                return Ok(features);
            }
            catch (OperationCanceledException)
            {
                return StatusCode(499);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while loading the feature catalog.");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
    }
}
