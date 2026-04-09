from __future__ import annotations

import logging
from typing import Any

from flask import Response, request
from flask_appbuilder.api import expose, protect, safe
from flask_appbuilder.security.decorators import permission_name
from flask_babel import gettext as _
from marshmallow import ValidationError

from superset.charts.schemas import ChartDataQueryContextSchema
from superset.commands.chart.data.get_data_command import ChartDataCommand
from superset.commands.chart.exceptions import (
    ChartDataCacheLoadError,
    ChartDataQueryFailedError,
)
from superset.constants import MODEL_API_RW_METHOD_PERMISSION_MAP
from superset.daos.exceptions import DatasourceNotFound
from superset.exceptions import QueryObjectValidationError
from superset.extensions import event_logger
from superset.views.base_api import BaseSupersetApi, requires_json, statsd_metrics

logger = logging.getLogger(__name__)


class MyFirstPivotRestApi(BaseSupersetApi):
    resource_name = "myfirst_pivot"
    allow_browser_login = True
    class_permission_name = "Chart"
    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP
    openapi_spec_tag = "MyFirst Pivot"

    @expose("/data", methods=("POST",))
    @protect()
    @safe
    @statsd_metrics
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.data",
        log_to_statsd=False,
    )
    @permission_name("post")
    @requires_json
    def data(self) -> Response:
        """
        Execute a runtime chart query for the custom pivot plugin and return the
        flat dataset used to build the table on the client.
        ---
        post:
          summary: Return runtime dataset for MyFirst pivot
          requestBody:
            required: true
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    query_context:
                      type: object
                    form_data:
                      type: object
          responses:
            200:
              description: Query result
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            403:
              $ref: '#/components/responses/403'
            404:
              $ref: '#/components/responses/404'
            422:
              $ref: '#/components/responses/422'
            500:
              $ref: '#/components/responses/500'
        """

        payload = request.json or {}
        query_context_payload = payload.get("query_context")

        if not isinstance(query_context_payload, dict):
            return self.response_400(message=_("`query_context` is required"))

        try:
            query_context = ChartDataQueryContextSchema().load(query_context_payload)
            command = ChartDataCommand(query_context)
            command.validate()
            result = command.run()
        except DatasourceNotFound:
            return self.response_404()
        except QueryObjectValidationError as error:
            return self.response_400(message=error.message)
        except ValidationError as error:
            return self.response_400(
                message=_(
                    "Request is incorrect: %(error)s",
                    error=error.normalized_messages(),
                )
            )
        except ChartDataCacheLoadError as error:
            return self.response_422(message=error.message)
        except ChartDataQueryFailedError as error:
            return self.response_400(message=error.message)

        queries = result.get("queries") or []
        first_query: dict[str, Any] = queries[0] if queries else {}
        return self.response(
            200,
            result={
                "data": first_query.get("data") or [],
                "colnames": first_query.get("colnames") or [],
                "coltypes": first_query.get("coltypes") or [],
                "rowcount": first_query.get("rowcount"),
                "query": first_query.get("query"),
            },
        )
