---
title: "Ready-Made AI Services"
description: Add AI to your application without a machine learning team. Services for images, speech, translation and documents, generative models on Bedrock, building your own with SageMaker AI, which ones support Arabic, and a hands-on chaining several of them.
date: 2026-11-02
series: aws
part: 24
numbered: true
tags: [aws, ai]
---

In [part twenty-three](/en/posts/aws-23-athena-redshift-glue/) we got answers from data that's already organized. But a lot of your data isn't: photos, voice calls and scanned invoices. Understanding them used to need a machine learning team. Today, much of it is one API call.

AWS offers three levels, and most people should start from the top:

<figure class="diagram">
<svg viewBox="0 0 640 212" role="img" aria-labelledby="ailayers-caption">
<defs>
<marker id="ailayers-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="45" y="18" text-anchor="middle" class="d-small">Easier</text>
<line x1="45" y1="28" x2="45" y2="176" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#ailayers-arrow)"/>
<text x="45" y="196" text-anchor="middle" class="d-small">More control</text>
<rect x="100" y="14" width="520" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="360" y="37" text-anchor="middle" class="d-label">Ready-made services</text>
<text x="360" y="57" text-anchor="middle" class="d-small">Rekognition, Polly, Textract and others: one API call</text>
<rect x="100" y="78" width="520" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="360" y="101" text-anchor="middle" class="d-label">Amazon Bedrock</text>
<text x="360" y="121" text-anchor="middle" class="d-small">Ready models you guide with prompts and your data</text>
<rect x="100" y="142" width="520" height="56" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="360" y="165" text-anchor="middle" class="d-label">Amazon SageMaker AI</text>
<text x="360" y="185" text-anchor="middle" class="d-small">Train and run your own models</text>
</svg>
<figcaption id="ailayers-caption">The further down you go, the more control you get over the model, and the more expertise and work it takes.</figcaption>
</figure>

| You want | Use |
| --- | --- |
| Understanding images and video | **Rekognition** |
| Speech to text | **Transcribe** |
| Text to speech | **Polly** |
| Translation | **Translate** |
| A chatbot or a phone system | **Lex** and **Connect** |
| Understanding text: sentiment and entities | **Comprehend** |
| Extracting text and tables from documents | **Textract** |
| Recommendations | **Personalize** |
| Generative models over your data | **Bedrock** |
| Training a model of your own | **SageMaker AI** |

## Images: Rekognition

**Rekognition** analyzes images and video without any training on your part:

- **Labels:** what's in the image, such as a car, a beach or a crowd.
- **Text:** reading words in images, such as signs.
- **Content moderation:** catching inappropriate images before they're published, and you can train it further on your own examples.
- **Faces:** detecting, comparing and searching for them.

Note that the **Streaming Video** and **Batch Image Content Moderation** features closed to new customers on April 30, 2026. Other features aren't affected, and you can process frames or batches yourself through the image API.

::: warning Be careful with faces
Identifying people has legal and ethical consequences that vary by country. Get consent, and check the regulations that apply to you before using it.
:::

## Speech: Transcribe and Polly

**Transcribe** turns speech into text, from a file in S3 or a live stream. It can tell speakers apart, add your own vocabulary such as product names, and hide personal data on supported languages.

**Polly** does the opposite, turning text into speech. You can control pronunciation in two ways:

- **Lexicons:** teach it to read `AWS` as "Amazon Web Services".
- **SSML:** tags in the text that add pauses, emphasis or even a whisper.

## Translate

**Amazon Translate** translates between 75 languages, in real time or in batches from S3. Add **custom terminology** to keep your brand names and terms as they are. Pairing it with Polly and Transcribe gets you a whole translated conversation.

## Conversation: Lex and Connect

**Lex** builds chatbots and voice bots. You define what the user may want, an **intent**, and the details you need to carry it out, called **slots**.

**Connect** is a contact center in the cloud: phone numbers, queues, flows and agents, with no equipment, and you pay by usage. Together they might work like this:

1. A customer calls the number on **Connect**.
2. They say "I want to change my appointment", and **Lex** understands the intent and asks for the date.
3. A [Lambda](/en/posts/aws-21-lambda-api-dynamodb/) function updates the appointment in your system.
4. If the bot gets stuck, Connect transfers the call to an agent.

## Text: Comprehend

**Comprehend** reads text and extracts its meaning: language, **sentiment**, entities such as people and places, key phrases and personal data. And you can train it to classify your own categories, such as the type of support ticket.

**Comprehend Medical** does this for clinical text: conditions, medications, doses and tests, and it detects protected health information.

Its **Topic Modeling**, **Event Detection** and **Prompt Safety Classification** features closed to new customers on April 30, 2026.

## Documents: Textract

**Textract** goes beyond reading text from a scanned file: it understands structure, so it returns **forms** as field-and-value pairs, and **tables** as rows and columns. It also has dedicated paths for invoices, receipts and identity documents.

## Recommendations: Personalize

**Personalize** builds "you might also like" from your users' behavior: you give it who viewed or bought what, and you get an API that returns recommendations in real time, or in batches for email campaigns. You don't need to design a model yourself.

## Search over your documents: what about Kendra?

You may read about **Amazon Kendra**, an intelligent search service for internal documents. It stopped accepting new customers on July 30, 2026, and AWS points to **Bedrock Knowledge Bases** as the alternative, which brings us to the next section.

## Generative models: Amazon Bedrock

**Bedrock** gives you foundation models from many providers, such as Anthropic, Amazon, Meta and Mistral, through one API, with no servers. You pay per token, meaning by the amount of text going in and out. The **Converse** API has a single form across models, so changing a model is a matter of changing one parameter.

You no longer need to enable models one at a time, since access is now controlled with IAM. The exception is Anthropic's models, which need a one-time form before first use.

### Knowledge Bases: answers from your documents

A model doesn't know your company's policies. Instead of training it, you find the relevant passages and hand them to it with the question. This is called **RAG**, and **Knowledge Bases** handles it for you:

<figure class="diagram">
<svg viewBox="0 0 640 204" role="img" aria-labelledby="rag-caption">
<defs>
<marker id="rag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="83" y="54" text-anchor="middle" class="d-label">Question</text>
<rect x="178" y="14" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="44" text-anchor="middle" class="d-label">Knowledge Base</text>
<text x="241" y="64" text-anchor="middle" class="d-small">Finds passages</text>
<rect x="336" y="14" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="44" text-anchor="middle" class="d-label">Model</text>
<text x="399" y="64" text-anchor="middle" class="d-small">Answers from them</text>
<rect x="494" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="557" y="44" text-anchor="middle" class="d-label">Answer</text>
<text x="557" y="64" text-anchor="middle" class="d-small">With its sources</text>
<line x1="146" y1="49" x2="176" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
<line x1="304" y1="49" x2="334" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
<line x1="462" y1="49" x2="492" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
<rect x="178" y="124" width="126" height="66" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="241" y="152" text-anchor="middle" class="d-label">Your documents</text>
<text x="241" y="172" text-anchor="middle" class="d-small">In S3 and others</text>
<line x1="241" y1="124" x2="241" y2="86" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
</svg>
<figcaption id="rag-caption">The Knowledge Base finds the passages closest to the question in your documents, and the model answers from them instead of from its memory.</figcaption>
</figure>

### The rest of the toolbox

| Tool | What it does |
| --- | --- |
| **Guardrails** | Blocks unwanted topics, hides personal data and helps reduce made-up answers |
| **AgentCore** | Runs and manages agents that take actions, with any framework and model |
| **Batch and caching** | Lower the cost of large workloads and repeated prompts |

**Bedrock Agents Classic** closed to new customers in favor of AgentCore, so don't start with it if you see it in an older article.

## Your own model: SageMaker AI

When ready-made isn't enough, such as predicting risks from data only you have, **Amazon SageMaker AI** (formerly SageMaker) covers the journey: notebooks, data preparation, training, then an endpoint serving predictions. **JumpStart** gives you hundreds of ready models to start from.

Don't confuse it with the new **Amazon SageMaker**, an umbrella that gathers data, analytics and AI in one studio. Also, several of its add-ons, such as Ground Truth, Clarify and Model Monitor, closed to new customers in mid-2026, so check a feature's status before relying on it.

### Bedrock or SageMaker AI?

| | Bedrock | SageMaker AI |
| --- | --- | --- |
| **Starts from** | A ready model | Your data, or a model you customize |
| **Management** | Serverless | You choose the compute, or use serverless customization |
| **You pay** | Per token | Mostly for compute |
| **Expertise** | A developer is enough | Machine learning helps a lot |

AWS's own advice: start with Bedrock using prompts and Knowledge Bases, and move to SageMaker AI when you need to change the model's behavior.

## And Arabic?

If your application serves Arabic speakers, check this first, because not all services are equal:

| Service | Arabic support |
| --- | --- |
| **Translate** | Yes |
| **Comprehend** | Yes, including sentiment |
| **Transcribe** | Gulf (`ar-AE`) and Modern Standard (`ar-SA`), though hiding personal data isn't supported for them |
| **Polly** | Zeina in Modern Standard, and Hala and Zayd in Gulf |
| **Textract** | No: English, French, German, Italian, Portuguese and Spanish only |
| **Bedrock** | Depends on the model, so try yours on your own text |

## Chaining services

The real strength lies in connecting them with what you've already learned. Imagine call recordings landing in S3, where each step triggers the next through [events or Step Functions](/en/posts/aws-22-serverless-design/):

<figure class="diagram">
<svg viewBox="0 0 640 118" role="img" aria-labelledby="chain-caption">
<defs>
<marker id="chain-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="28" width="126" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="83" y="54" text-anchor="middle" class="d-label">Call recording</text>
<text x="83" y="74" text-anchor="middle" class="d-small">In S3</text>
<rect x="178" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="54" text-anchor="middle" class="d-label">Transcribe</text>
<text x="241" y="74" text-anchor="middle" class="d-small">To text</text>
<rect x="336" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="54" text-anchor="middle" class="d-label">Comprehend</text>
<text x="399" y="74" text-anchor="middle" class="d-small">Sentiment</text>
<rect x="494" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="557" y="54" text-anchor="middle" class="d-label">Bedrock</text>
<text x="557" y="74" text-anchor="middle" class="d-small">A summary</text>
<line x1="146" y1="59" x2="176" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#chain-arrow)"/>
<line x1="304" y1="59" x2="334" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#chain-arrow)"/>
<line x1="462" y1="59" x2="492" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#chain-arrow)"/>
</svg>
<figcaption id="chain-caption">Each service does one job and hands its result to the next, without any model to train.</figcaption>
</figure>

Without any machine learning, a manager now reads a summary of every call and sees which ones ended badly.

## Hands-on: a review passes through four services

We'll take a customer review, analyze it, translate it, voice it and reply to it. Everything is a direct call with nothing to set up. These services aren't in every Region, so if a command reports that it can't connect, add `--region us-east-1` to it. From CloudShell:

```bash
REVIEW="The app is great, but delivery was very slow and support never replied."

aws comprehend detect-dominant-language --text "$REVIEW" \
  --query "Languages[0]"

aws comprehend detect-sentiment --language-code en --text "$REVIEW" \
  --query "[Sentiment,SentimentScore]"

aws comprehend detect-key-phrases --language-code en --text "$REVIEW" \
  --query "KeyPhrases[].Text"
```

You'll see the language, the sentiment with its scores, and the key phrases. Now translate it to Arabic, then check that Comprehend understands the translation too:

```bash
ARABIC=$(aws translate translate-text --text "$REVIEW" \
  --source-language-code en --target-language-code ar \
  --query TranslatedText --output text)

echo "$ARABIC"

aws comprehend detect-sentiment --language-code ar --text "$ARABIC" \
  --query Sentiment --output text
```

Voice the translation with Polly:

```bash
aws polly synthesize-speech --voice-id Zeina --output-format mp3 \
  --text "$ARABIC" review.mp3

ls -lh review.mp3
```

To listen, from the CloudShell **Actions** menu choose **Download file**, and enter `review.mp3`.

Finally, ask a model on Bedrock to reply to the customer. The first command looks up the identifier of a low-cost Amazon Nova Lite model in your Region. If it prints `None`, add `--region us-east-1` to both commands:

```bash
MODEL=$(aws bedrock list-inference-profiles \
  --query "inferenceProfileSummaries[?contains(inferenceProfileId,'nova') && contains(inferenceProfileId,'lite')].inferenceProfileId | [0]" \
  --output text)
echo $MODEL

aws bedrock-runtime converse --model-id $MODEL \
  --messages "[{\"role\":\"user\",\"content\":[{\"text\":\"Reply to this customer in two short sentences: $REVIEW\"}]}]" \
  --query "output.message.content[0].text" --output text
```

Got a photo? Upload it from **Actions**, then **Upload file**, and ask Rekognition what's in it:

```bash
aws rekognition detect-labels --image-bytes fileb://photo.jpg \
  --max-labels 5 --query "Labels[].[Name,Confidence]" --output table
```

::: security Nothing to delete
These calls create no resources, and they cost a small fraction of a cent. But note that your text goes to these services, so review the data rules for each one before sending your customers' real data.
:::

## Summary

- Start from the **ready-made services**, then **Bedrock**, and only then **SageMaker AI**.
- **Rekognition** for images, **Transcribe** and **Polly** for speech, **Translate** for translation, and **Comprehend** for text.
- **Textract** reads structured documents, but it doesn't support Arabic.
- **Knowledge Bases** answers from your documents without training a model, and it's the alternative to Kendra.
- Connecting these services with events is where the real value is.

## Test yourself

::: quiz
An insurer receives thousands of scanned claim forms in English. It wants each form's fields, values and tables in its database, with no model to train. Which service fits?

- [ ] Amazon Rekognition
- [x] Amazon Textract
- [ ] Amazon Comprehend
- [ ] Amazon Transcribe

Textract understands a document's structure, so it returns forms as field-and-value pairs, and tables as rows and columns.

- **A:** This can read words in an image, but it doesn't understand forms and tables.
- **C:** This extracts meaning from text you already have, and doesn't read scanned files.
- **D:** This turns speech into text.

Review: [Documents: Textract](#documents-textract) in this part, and [What is Amazon Textract?](https://docs.aws.amazon.com/textract/latest/dg/what-is.html) in the AWS docs.
:::

::: quiz
A company new to AWS wants an assistant that answers employees' questions from its internal policy documents. It has no machine learning team. What fits?

- [ ] Amazon Kendra
- [ ] A model trained on the documents in SageMaker AI
- [ ] Amazon Lex on its own
- [x] Amazon Bedrock Knowledge Bases

Knowledge Bases finds the relevant passages and hands them to a model along with the question, so there's nothing to train.

- **A:** This no longer accepts new customers, and AWS points to Knowledge Bases instead.
- **B:** This needs machine learning expertise, and answering from documents doesn't need a trained model.
- **C:** This builds bots around intents you define, and doesn't answer from documents by itself.

Review: [Knowledge Bases: answers from your documents](#knowledge-bases-answers-from-your-documents) in this part, and [Retrieve data and generate AI responses with Amazon Bedrock Knowledge Bases](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html) in the AWS docs.
:::

::: quiz
A bank's data scientists want to predict loan risk from years of its own repayment records, and no ready-made service does this. What fits?

- [x] Amazon SageMaker AI
- [ ] Amazon Bedrock, using prompts
- [ ] Amazon Personalize
- [ ] Amazon Comprehend

This is predicting from data only the bank has, which needs a model of its own. SageMaker AI covers preparing the data, training, then serving predictions from an endpoint.

- **B:** This starts from a ready model, and doesn't train a prediction model on the bank's records.
- **C:** This builds recommendations from user behavior, such as "you might also like".
- **D:** This extracts meaning from text, such as sentiment and entities.

Review: [Your own model: SageMaker AI](#your-own-model-sagemaker-ai) in this part, and [Amazon Bedrock or Amazon SageMaker AI?](https://docs.aws.amazon.com/decision-guides/latest/bedrock-or-sagemaker/bedrock-or-sagemaker.html) in the AWS docs.
:::

::: quiz
A call center stores its recordings in S3, in English. A manager wants to know which calls ended badly, without any machine learning work. Which chain fits?

- [ ] Polly, then Comprehend
- [ ] Rekognition, then Translate
- [x] Transcribe, then Comprehend
- [ ] Textract, then Personalize

Transcribe turns each recording into text, and Comprehend's sentiment analysis shows which calls were negative.

- **A:** Polly does the opposite of what's needed, turning text into speech.
- **B:** Rekognition analyzes images and video, and Translate only changes the language.
- **D:** Textract reads documents, and Personalize builds recommendations.

Review: [Chaining services](#chaining-services) in this part, and [What is Amazon Transcribe?](https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html) and [Sentiment](https://docs.aws.amazon.com/comprehend/latest/dg/how-sentiment.html) in the AWS docs.
:::

::: quiz
A Saudi online store wants to detect the sentiment of its Arabic reviews directly, and translate them into English for its head office. Which **two** services fit? (Choose two.)

- [ ] Amazon Textract
- [ ] Amazon Polly
- [x] Amazon Comprehend
- [ ] Amazon Rekognition
- [x] Amazon Translate

Comprehend supports Arabic, including sentiment, and Translate handles the translation.

- **A:** This reads documents, and it doesn't support Arabic.
- **B:** This voices text, and doesn't analyze or translate it.
- **D:** This analyzes images and video.

Review: [And Arabic?](#and-arabic) in this part, and [Languages supported in Amazon Comprehend](https://docs.aws.amazon.com/comprehend/latest/dg/supported-languages.html) and [Supported languages and language codes](https://docs.aws.amazon.com/translate/latest/dg/what-is-languages.html) in the AWS docs.
:::

This completes the data and AI section. Your application is big now, and it has a lot running in it. How do you know it's healthy, and who changed what? In [**part twenty-five**](/en/posts/aws-25-monitoring-auditing/) we start the final section, with monitoring and auditing through CloudWatch, CloudTrail and Config.
