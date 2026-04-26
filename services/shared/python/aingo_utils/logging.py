import logging
import sys
import os
from loguru import logger
from typing import Optional


class InterceptHandler(logging.Handler):
    """
    Standard Python logging Interceptor for Loguru.
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


def setup_logging(
    level: str = "INFO",
    debug: bool = False,
    app_env: str = "development"
):
    """
    Replaces all standard logging handlers with Loguru and configures 
    a consistent colorized format for the CLI.
    """
    
    # 1. Clean up standard logging root
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # 2. Force propagation for all existing loggers and clear their handlers
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True

    # 3. Configure Loguru
    logger.remove()  # Remove default handler

    # Custom colors for levels (Loguru built-in tags)
    logger.level("INFO", color="<cyan>")
    logger.level("DEBUG", color="<magenta>")
    logger.level("WARNING", color="<yellow>")
    logger.level("ERROR", color="<red>")

    if app_env == "production":
        # Structured logs for production
        logger.add(
            sys.stderr,
            format="{time:YYYY-MM-DD at HH:mm:ss} | {level} | {message}",
            serialize=True,
            level=level,
        )
    else:
        # User defined pretty format for development
        # Matches the aesthetic requested by the user
        log_format = (
            "<level><bold>{level:<5}</bold></level>: "
            "<level><white><bold>{message}</bold></white></level> "
            "<light-black>({name}:{function}:{line})</light-black>"
        )
        
        logger.add(
            sys.stderr,
            format=log_format,
            level="DEBUG" if debug else level,
            colorize=True,
        )

    logger.info(f"Logging initialized. Env: {app_env}, Debug: {debug}")
