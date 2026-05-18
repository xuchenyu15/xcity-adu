import svgPaths from "./svg-k93w4macfq";
import imgImageGalleryImage1 from "figma:asset/4487ba8a92fba78eeb5ef7fd5507fedb5836a873.png";
import imgImage from "figma:asset/18332cb1ad97fb2363eafb00938d3b55abe86205.png";
import imgImage1 from "figma:asset/0c3bf1a084b2a99f9b6853e5e2d9d5ec9f7b041f.png";
import imgImage2 from "figma:asset/aaedb5bebdd45dfa98ac5fa31137a02f152d3955.png";
import imgImage3 from "figma:asset/0237ddf63643d28b30482b5fd57c5eb5d2dd9024.png";
import imgImage4 from "figma:asset/675cc6846b6d05091397fefffc20b7eca55f2776.png";
import imgImage5 from "figma:asset/00073f9b1fcc5f43ae8f14ac6fff2c6f0f59fec3.png";
import imgImage6 from "figma:asset/15ba7085002c63d42df318d8e971d20fc2fe2784.png";

function ImageGalleryImage() {
  return (
    <div className="absolute h-[726.992px] left-[249.78px] rounded-[6px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] top-[48px] w-[1292.438px]" data-name="Image (Gallery image 1)">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[6px]">
        <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[6px]" />
        <img alt="" className="absolute max-w-none object-contain rounded-[6px] size-full" src={imgImageGalleryImage1} />
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="h-[32px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%_-16.67%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 18.6667">
            <path d={svgPaths.p3c470980} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.05)] content-stretch flex flex-col items-start left-[32px] pb-0 pt-[16px] px-[16px] rounded-[16777200px] size-[64px] top-[379.5px]" data-name="Button">
      <Icon />
    </div>
  );
}

function Icon1() {
  return (
    <div className="h-[32px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%_-16.67%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 18.6667">
            <path d={svgPaths.p18812b00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.05)] content-stretch flex flex-col items-start left-[1696px] pb-0 pt-[16px] px-[16px] rounded-[16777200px] size-[64px] top-[379.5px]" data-name="Button">
      <Icon1 />
    </div>
  );
}

function GalleryModal() {
  return (
    <div className="absolute h-[823px] left-0 overflow-clip top-0 w-[1792px]" data-name="GalleryModal">
      <ImageGalleryImage />
      <Button />
      <Button1 />
    </div>
  );
}

function Image() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImageGalleryImage1} />
    </div>
  );
}

function Button2() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0)] content-stretch flex flex-col h-[64px] items-start left-[24px] overflow-clip rounded-[4px] shadow-[0px_0px_0px_2px_white] top-[8px] w-[96px]" data-name="Button">
      <Image />
    </div>
  );
}

function Image1() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage} />
    </div>
  );
}

function Button3() {
  return (
    <div className="absolute content-stretch flex flex-col h-[64px] items-start left-[128px] opacity-40 overflow-clip rounded-[4px] top-[8px] w-[96px]" data-name="Button">
      <Image1 />
    </div>
  );
}

function Image2() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage1} />
    </div>
  );
}

function Button4() {
  return (
    <div className="absolute content-stretch flex flex-col h-[64px] items-start left-[232px] opacity-40 overflow-clip rounded-[4px] top-[8px] w-[96px]" data-name="Button">
      <Image2 />
    </div>
  );
}

function Image3() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
    </div>
  );
}

function Button5() {
  return (
    <div className="absolute content-stretch flex flex-col h-[64px] items-start left-[336px] opacity-40 overflow-clip rounded-[4px] top-[8px] w-[96px]" data-name="Button">
      <Image3 />
    </div>
  );
}

function Image4() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage3} />
    </div>
  );
}

function Button6() {
  return (
    <div className="absolute content-stretch flex flex-col h-[64px] items-start left-[440px] opacity-40 overflow-clip rounded-[4px] top-[8px] w-[96px]" data-name="Button">
      <Image4 />
    </div>
  );
}

function Image5() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage4} />
    </div>
  );
}

function Button7() {
  return (
    <div className="absolute content-stretch flex flex-col h-[64px] items-start left-[544px] opacity-40 overflow-clip rounded-[4px] top-[8px] w-[96px]" data-name="Button">
      <Image5 />
    </div>
  );
}

function Image6() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage5} />
    </div>
  );
}

function Button8() {
  return (
    <div className="absolute content-stretch flex flex-col h-[64px] items-start left-[648px] opacity-40 overflow-clip rounded-[4px] top-[8px] w-[96px]" data-name="Button">
      <Image6 />
    </div>
  );
}

function Image7() {
  return (
    <div className="h-[64px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage6} />
    </div>
  );
}

function Button9() {
  return (
    <div className="absolute content-stretch flex flex-col h-[64px] items-start left-[752px] opacity-40 overflow-clip rounded-[4px] top-[8px] w-[96px]" data-name="Button">
      <Image7 />
    </div>
  );
}

function Container() {
  return (
    <div className="h-[80px] relative shrink-0 w-[872px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <Button2 />
        <Button3 />
        <Button4 />
        <Button5 />
        <Button6 />
        <Button7 />
        <Button8 />
        <Button9 />
      </div>
    </div>
  );
}

function GalleryModal1() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0.8)] content-stretch flex h-[96px] items-center justify-center left-0 pb-0 pt-px px-0 top-[823px] w-[1792px]" data-name="GalleryModal">
      <div aria-hidden="true" className="absolute border-[rgba(255,255,255,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Container />
    </div>
  );
}

function Icon2() {
  return (
    <div className="h-[32px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.6667 18.6667">
            <path d={svgPaths.p3d9cb200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.6667 18.6667">
            <path d={svgPaths.p1905a700} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function GalleryModal2() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex flex-col items-start left-[1720px] pb-0 pt-[8px] px-[8px] rounded-[16777200px] size-[48px] top-[24px]" data-name="GalleryModal">
      <Icon2 />
    </div>
  );
}

export default function Container1() {
  return (
    <div className="bg-[rgba(0,0,0,0.95)] relative size-full" data-name="Container">
      <GalleryModal />
      <GalleryModal1 />
      <GalleryModal2 />
    </div>
  );
}