import { useState, useEffect } from "react";
import Head from "next/head";
import FileSaver from "file-saver";
import useSound from "use-sound";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const examples = [
  {
    prompt:
      "Muddy ground with autumn leaves seamless texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/9b8f4ec9-eef0-437f-a27a-cbd233d22407/out-0.png",
  },
  {
    prompt:
      "Lunar surface seamless texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/8f75db20-72d9-4917-bc86-db4ca5d73c35/out-0.png",
  },
  {
    prompt:
      "Tree bark seamless photoscan texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/7d3bc46c-612f-42cb-9347-317b2db1d3d6/out-0.png",
  },
];

export default function Home() {
  const example = examples[Math.floor(Math.random() * examples.length)];
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [cols, setCols] = useState("");
  const [rows, setRows] = useState("");
  const [total, setTotal] = useState(0);
  const [wallpaper, setWallpaper] = useState(example.image);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    var cols = Math.min(Math.ceil(window.innerWidth / 512), 12);
    var rows = Math.min(Math.ceil(window.innerHeight / 512), 12);
    setTotal(cols * rows);
    setCols(`grid-cols-${cols}`);
    setRows(`grid-rows-${rows}`);
    console.log(cols, rows, total);
  }, []);

  const [playActive] = useSound("/beep.mp3", { volume: 0.25 });
  const [playSuccess] = useSound("/ding.wav", { volume: 0.25 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: e.target.prompt.value,
        width: "512",
        height: "512",
      }),
    });
    let prediction = await response.json();
    if (response.status !== 201) {
      setError(prediction.detail);
      return;
    }
    setPrediction(prediction);
    setLoading(true);

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await sleep(1000);
      const response = await fetch("/api/predictions/" + prediction.id);
      prediction = await response.json();
      if (response.status !== 200) {
        setError(prediction.detail);
        return;
      }
      console.log({ prediction });
      setPrediction(prediction);

      if (prediction.status === "succeeded") {
        resetWallpaper(prediction.output);
        setLoading(false);
      }
    }
  };

  const resetWallpaper = (image) => {
    const tiles = document.getElementsByClassName("tile");
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove("animate-drop");
    }

    const interval = setInterval(playActive, 100);

    setTimeout(() => {
      for (let i = 0; i < tiles.length; i++) {
        tiles[i].classList.add("animate-drop");
      }
      setWallpaper(image);
    }, 10);

    setTimeout(() => {
      clearInterval(interval), playSuccess();
    }, 1700);
  };

  const stitchImages = async (imageUrl) => {
    const image = await fetch(imageUrl);
    const imageBlob = await image.blob();
    const imageURL = URL.createObjectURL(imageBlob);

    var myCanvas = document.getElementById("canvas");
    var ctx = myCanvas.getContext("2d");

    const screenHeight = window.screen.height * window.devicePixelRatio;
    const screenWidth = window.screen.width * window.devicePixelRatio;

    ctx.canvas.width = screenWidth;
    ctx.canvas.height = screenHeight;

    var img = new Image();
    img.src = imageURL;

    var x = 0;
    var y = 0;

    img.addEventListener("load", (e) => {
      while (y < screenHeight) {
        while (x < screenWidth) {
          ctx.drawImage(img, x, y);
          x += 512;
        }
        x = 0;
        y += 512;
      }
    });

    ctx.fillStyle = "green";
    ctx.fillRect(100, 100, 100, 100);

    return myCanvas.toDataURL("image/png");
  };

  const download = async (image) => {
    stitchImages(image);

    // I couldn't figure out the async/await version of this
    // so I just used a setTimeout to wait for the canvas to be drawn
    setTimeout(() => {
      var myCanvas = document.getElementById("canvas");
      const dataUrl = myCanvas.toDataURL("image/png");
      FileSaver.saveAs(dataUrl, "wallpaper.png");
    }, 100);
  };

  return (
    <>
      <div className="relative min-h-screen">
        <Head>
          <title>Wallpaper Creator</title>
        </Head>

        <div className={`grid grid-cols-4 grid-rows-4`}>
          {Array(total)
            .fill(1)
            .map((_value, index) => (
              <img
                key={`tile-${index}`}
                id={index}
                className="tile animate-drop"
                style={{ animationDelay: `${index * 0.1}s` }}
                src={wallpaper}
                alt=""
              />
            ))}
        </div>

        <div className="fixed hidden top-0 left-0">
          <canvas id="canvas" className="fixed top-0 left-0"></canvas>
        </div>

        <form
          className="max-w-sm mx-auto absolute top-4"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            ></label>
            <div className="mt-1 border-gray-300 focus-within:border-indigo-600">
              <input
                type="text"
                name="prompt"
                id="name"
                className="block w-full rounded-lg bg-gray-50 focus:border-indigo-600 focus:ring-0 sm:text-sm"
                placeholder="Enter your wallpaper prompt"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetWallpaper(
                examples[Math.floor(Math.random() * examples.length)].image
              );
            }}
          >
            Set Wallpaper
          </button>

          <button
            type="button"
            onClick={() => playActive()}
            className="bg-orange-500 -4"
          >
            sound
          </button>

          <button
            type="button"
            className="bg-red-500 p-4"
            onClick={() => {
              download(wallpaper);
            }}
          >
            Download
          </button>

          <div className="mt-4 text-center">
            {loading ? (
              <button
                type="submit"
                disabled
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-800 px-6 py-3 text-base font-medium text-indigo-300 shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <div role="status">
                  <svg
                    aria-hidden="true"
                    class="w-6 h-6 mr-3 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span class="sr-only">Loading...</span>
                </div>
                Creating your wallpaper...
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Create your wallpaper
              </button>
            )}
          </div>
        </form>

        {error && <div>{error}</div>}

        {prediction && <p>status: {prediction.status}</p>}
      </div>
    </>
  );
}
