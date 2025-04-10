# mrw review notes

## flask-llm

The first topic I'd discuss is observability. With an AI application, that comes
in two flavors: metrics and logging. Metrics are going to be important for operations;
for example, when students are doing their exercises if all of the sudden the LLM calls
are taking 30 seconds and returning errors, I want somebody to get paged. Logging is
more for what are called "MLOps": basically, the iterative process of improving your prompts,
possibly fine-tuning models with feedback, things of that nature. 

### metrics

Here, we generally look for the [Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/#:~:text=is%20fairly%20useless.-,The%20Four%20Golden%20Signals,-The%20four%20golden), which are Latency, Traffic, Errors, and Saturation. These are so
common that when you instrument your code, you generally get it for free.

In a flask app, I'd probably put those metrics in with 
[prometheus-flask-exporter](https://pypi.org/project/prometheus-flask-exporter/).
Generally, you set up an Open Telemetry collector to gather htese metrics, and then
you can feed that data into Datadog (if you've got lots of money) or Grafana (if you're cheap!
Or are really philosophcally into OSS or self-hosting, like me.) 

### logging

We need two kinds of logs for a flask app that's chattering with an LLM. The first are access
logs: somebody called this endpoint at this date with these parameters and got this result.

```
192.168.1.10 - - [10/Apr/2025:10:30:00 +0000] "GET /index.html HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
```

(Also, if you don't know why everybody's user-agent says they're Mozilla, ask me about the browser wars of the late 90's!)

But with an LLM, we definitely need to log somewhere (likely, in this case, to a database), exactly what prompt you sent to the LLM, and exactly what response you got and in what format.

So, I would decompose /api/message-request into separate routes for each type of task.
Instead of the long conditional blocks (like lines 90-114) where you compose the prompt,
I'd have one prompt that's a template for each route.

I would probably, in fact, load those templates from a database (probably the same one!),
because the iterative process of improving the prompt, or other "MLOps", which might
include fine-tuning custom models at some point, will likely need to access the
prompts differently.

### other notes on flask

Another metric I would definitely collect is the number of retries and attempts that happen
on lines 140-164. We have to know if chatgpt is repeatedly failing to output in JSON.

## backend

The first big takeaway is that there isn't separation of concerns here. For example,
GetPrescriptionByID(...) can throw an error if there's a supabase select error, or
if the select returns zero rows, likely due to an invalid or missing id.

Pseudocode for how I'd rewrite it:

- GetPrescriptionById(w http.ResponseWriter, r *http.Request) {
    // do http-related stuff
    // call database.GetPrescriptionById(id) (which should return a prescription)
    // if it returns an error, return a 500
    // if it returns 0 records, return that 404, or a 418.
    // if it returns 1 record, marshal it and return
}

And then use dependency injection to inject either:
- a supabase library
- a mock that can be used to unit test the http method
- some other database (in-memory sqlite?) for local development
- some other database entirely if and when we have to migrate.

The second takeaway is pagination: the responses for GetPatients(), GetPrescriptions(),
GetStudents(), and the like are going to return quite a few records eventually. (Totally
of scope for the beta!)