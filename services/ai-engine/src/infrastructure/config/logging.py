import logging
import sys
from loguru import logger
from src.infrastructure.config.settings import settings


class InterceptHandler(logging.Handler):
    """
    Default handler from examples in loguru documentation.
    See https://loguru.readthedocs.io/en/stable/overview.html#entirely-compatible-with-standard-logging
    """

    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = str(record.levelno)

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging():
    # Remove all existing handlers
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(logging.INFO)

    # Remove higher-level handlers for uvicorn/fastapi to avoid duplicates
    # and let them be caught by root handler -> InterceptHandler
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True

    # Configure Loguru
    logger.remove()  # Remove default handler

    # Custom colors for levels
    logger.level("INFO", color="<cyan>")
    logger.level("DEBUG", color="<red>")

    if settings.app_env == "production":
        # JSON logs for production
        logger.add(
            sys.stderr,
            format="{time:YYYY-MM-DD at HH:mm:ss} | {level} | {message}",
            serialize=True,
            level="INFO",
        )
    else:
        # Structured, colorful logs for development
        logger.add(
            sys.stderr,
            format="<level><bold>{level:<5}</bold></level>: <level><white><bold>{message}</bold></white></level> <light-black>({name}:{function}:{line})</light-black>",
            level="DEBUG" if settings.debug else "INFO",
            colorize=True,
        )

    logger.info(f"Logging configured. Env: {settings.app_env}, Debug: {settings.debug}")
    logger.debug("This is a debug message")
